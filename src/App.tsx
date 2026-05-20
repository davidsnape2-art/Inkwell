import React, { useState, useEffect } from "react";
import { auth, signIn } from "./lib/firebase";
import { User } from "firebase/auth";
import { LogIn, LogOut, BookOpen, PenTool, Sparkles, Trash2, ChevronRight, Save, Plus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "./lib/firebase";
import { Story, Chapter } from "./types";
import { cn, getAISuggestion } from "./lib/utils";
import ReactMarkdown from "react-markdown";

// --- Components ---

function Navbar({ user }: { user: User | null }) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signIn();
    } catch (err) {
      console.error("Auth helper failed:", err);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <nav className="border-b border-border-subtle py-4 px-6 flex justify-between items-center bg-paper/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-sage" />
        <span className="font-serif text-2xl font-light tracking-tight text-earth italic">StorySmith</span>
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium opacity-60 hidden sm:block text-earth">{user.displayName || "Guest Scholar"}</span>
            <button
              onClick={() => auth.signOut()}
              className="flex items-center gap-2 text-sm font-semibold text-earth hover:text-sage transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="flex items-center gap-2 px-6 py-2 bg-earth text-paper rounded-lg text-sm font-semibold hover:bg-sage transition-all disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {isSigningIn ? "Signing In..." : "Sign In"}
          </button>
        )}
      </div>
    </nav>
  );
}

function Landing() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleStart = async () => {
    setIsSigningIn(true);
    try {
      await signIn();
    } catch (err) {
      console.error("Landing sign-in failed:", err);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-serif text-7xl mb-8 leading-tight font-light text-earth"
      >
        Write stories that <span className="italic font-normal">breathe</span>.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-xl text-earth opacity-70 mb-12 max-w-2xl mx-auto"
      >
        A curated space for authors to craft worlds, organize chapters, and refine manuscripts with the elegance of modern design and AI assistance.
      </motion.p>
      <div className="flex flex-col items-center gap-3">
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          onClick={handleStart}
          disabled={isSigningIn}
          className="px-10 py-5 bg-earth text-paper rounded-xl text-lg font-semibold hover:bg-sage transition-all flex items-center gap-3 mx-auto shadow-lg shadow-earth/10 disabled:opacity-50"
        >
          {isSigningIn ? "Opening Inkwell..." : "Start Your Story"} <ChevronRight className="w-5 h-5" />
        </motion.button>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-sans text-earth mt-2"
        >
          Supports instant automatic fallback guest workspace if popup is blocked
        </motion.p>
      </div>
    </div>
  );
}

function Dashboard({ stories, onCreate, onSelect }: { stories: Story[], onCreate: () => void, onSelect: (s: Story) => void }) {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-[2px] text-earth opacity-40 font-bold mb-2">Workspace / Library</div>
          <h2 className="font-serif text-5xl font-light text-earth">Selected Works</h2>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-8 py-4 bg-sage text-white rounded-xl font-semibold hover:shadow-xl hover:shadow-sage/20 transition-all"
        >
          <PenTool className="w-4 h-4" />
          Create New Manuscript
        </button>
      </div>

      {stories.length === 0 ? (
        <div className="border border-dashed border-border-subtle rounded-3xl p-24 text-center bg-white/50">
          <BookOpen className="w-12 h-12 text-earth/10 mx-auto mb-4" />
          <p className="text-earth/40 font-medium">Your archive is empty. Begin a new journey.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {stories.map((story) => (
            <motion.div
              key={story.id}
              layoutId={story.id}
              onClick={() => onSelect(story)}
              className="group cursor-pointer bg-white border border-border-subtle rounded-2xl p-10 hover:shadow-2xl hover:shadow-earth/5 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="text-[10px] uppercase tracking-[1.5px] text-sage font-bold mb-6 block">
                  {story.genre || "GENERAL FICTION"}
                </span>
                <h3 className="font-serif text-3xl mb-4 text-earth group-hover:text-sage transition-colors leading-tight">{story.title}</h3>
                <p className="text-ink/60 line-clamp-3 text-sm leading-relaxed mb-6 font-serif italic">
                  {story.description || "Describe the core of this tale..."}
                </p>
              </div>
              <div className="flex justify-between items-center pt-8 border-t border-border-subtle">
                <span className="text-[10px] uppercase font-bold text-earth/30 tracking-wider">
                  Updated {story.updatedAt?.seconds ? new Date(story.updatedAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                </span>
                <ChevronRight className="w-4 h-4 text-earth/20 group-hover:translate-x-1 group-hover:text-sage transition-all" />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Editor({ story, onBack }: { story: Story, onBack: () => void }) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!story?.id) return;
    const q = query(
      collection(db, `stories/${story.id}/chapters`)
    );
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Chapter));
      // Sort in memory
      const sorted = data.sort((a, b) => a.order - b.order);
      setChapters(sorted);
      if (sorted.length > 0 && !activeChapter) setActiveChapter(sorted[0]);
    }, (error) => {
      console.error("Chapters subscription failed:", error);
    });
  }, [story.id]);

  const addChapter = async () => {
    try {
      const newChapter = {
        storyId: story.id,
        title: "Unnamed Chapter",
        content: "",
        order: chapters.length + 1,
        authorId: auth.currentUser!.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const docRef = await addDoc(collection(db, `stories/${story.id}/chapters`), newChapter);
      setActiveChapter({ ...newChapter, id: docRef.id } as Chapter);
    } catch (error: any) {
      console.error("Chapter creation failed:", error);
      alert(`Could not create chapter: ${error.message || error}`);
    }
  };

  const handleUpdate = async (fields: Partial<Chapter>) => {
    if (!activeChapter) return;
    try {
      const docRef = doc(db, `stories/${story.id}/chapters`, activeChapter.id);
      await updateDoc(docRef, { ...fields, updatedAt: serverTimestamp() });
      setActiveChapter(prev => prev ? ({ ...prev, ...fields }) : null);
    } catch (error: any) {
      console.error("Chapter update failed:", error);
    }
  };

  const askAi = async () => {
    if (!story) return;
    setIsAiLoading(true);
    setAiResult("");
    try {
      // Create a solid context block defining story properties and scene details
      const storyContext = `
Title: ${story.title}
Genre: ${story.genre || "General Fiction"}
Description: ${story.description || "No description provided"}
Active Chapter: ${activeChapter?.title || "Draft"}
Scene Notes: ${activeChapter?.notes || "No draft notes available"}
      `.trim();

      const prompt = activeChapter?.content 
        ? `Review the existing text (current draft length: ${activeChapter.content.length} characters):
"${activeChapter.content.slice(0, 3000)}"

Develop three highly evocative continuing paths. Organize your suggestions exactly into these matching headings:

### 💫 Chapter Continuations
Formulate three (3) contrasting lines of action, focusing on sensory feedback, visceral beats, and transitional timing.

### 👤 Character Development
Expose psychological undertones, active internal conflicts, or relationship tension for the active characters. Provide a snippet of spoken dialogue or direct subtext.

### 🌍 World-Building Elements
Introduce evocative environment details, setting lore, weather/auditory triggers, or localized setting features to enrich the mood.`
        : `Let's draft a new manuscript titled "${story.title}" in the genre "${story.genre || "General Fiction"}".

Develop three starting configurations. Organize your suggestions exactly into:

### 💫 Chapter Continuations
Provide three (3) distinct narrative starts or hooks with high visual imagery and dramatic questions.

### 👤 Character Development
Define the initial motivation, immediate baggage, and active goals of the characters stepping into this space. Include an atmospheric spoken quote.

### 🌍 World-Building Elements
Describe 2-3 sensory and physical specifics of the starting setting (specifically mentioning soundscapes, temperature, or lighting) to establish a distinct environment.`;

      const { suggestion } = await getAISuggestion(prompt, storyContext);
      setAiResult(suggestion);
    } catch (err: any) {
      console.error(err);
      setAiResult("The Ethereal Council is momentarily unreachable. Please verify your connection or your API key configuration in Settings.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-paper">
      {/* Sidebar Left */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-border-subtle bg-sidebar flex flex-col"
          >
            <div className="p-8 pb-4 flex justify-between items-center">
               <button onClick={onBack} className="text-[11px] uppercase font-bold text-earth/50 hover:text-earth transition-colors tracking-widest flex items-center gap-1">
                <ChevronRight className="w-3 h-3 rotate-180" /> Back
              </button>
              <button 
                onClick={addChapter} 
                className="p-2 bg-sage/10 text-sage rounded-lg hover:bg-sage hover:text-white transition-all shadow-sm"
                title="New Chapter"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="p-8 pt-4 flex-1 overflow-y-auto">
              <div className="section-header">Manuscript Chapters</div>
              <div className="space-y-1">
                {chapters.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setActiveChapter(c)}
                    className={cn(
                      "nav-item-natural w-full text-left line-clamp-1",
                      activeChapter?.id === c.id 
                        ? "nav-item-active" 
                        : "nav-item-hover text-ink/60"
                    )}
                  >
                    <span className="font-medium">{c.title}</span>
                  </button>
                ))}
              </div>

              <div className="section-header mt-12">Story Meta</div>
              <div className="px-5 space-y-4">
                <div className="text-[10px] text-earth/40 uppercase font-bold tracking-widest">Genre</div>
                <div className="text-sm font-medium text-earth">{story.genre || "UNCATEGORIZED"}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Column */}
      <div className="flex-1 overflow-y-auto flex flex-col p-10 md:p-14 relative">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute left-6 top-6 p-2.5 bg-white rounded-lg border border-border-subtle shadow-sm hover:scale-105 active:scale-95 transition-all z-10 text-earth"
        >
          <ChevronRight className={cn("w-4 h-4 transition-transform", isSidebarOpen && "rotate-180")} />
        </button>

        <div className="breadcrumb text-xs mb-8 text-earth opacity-40 uppercase tracking-widest font-bold">
          Archive / {story.title} / {activeChapter?.title || "Draft"}
        </div>

        {activeChapter ? (
          <div className="max-w-3xl w-full mx-auto manuscript-paper p-16 md:p-24 flex-1 flex flex-col">
            <input
              type="text"
              value={activeChapter.title}
              onChange={(e) => handleUpdate({ title: e.target.value })}
              className="font-serif text-4xl mb-10 w-full bg-transparent focus:outline-none focus:border-b border-border-subtle text-earth font-normal"
              placeholder="Chapter Title..."
            />
            
            <textarea
              value={activeChapter.content}
              onChange={(e) => handleUpdate({ content: e.target.value })}
              className="font-serif text-xl w-full flex-1 bg-transparent resize-none leading-[1.8] focus:outline-none text-ink placeholder:text-ink/20"
              placeholder="The words began to flow like a river..."
            />
          </div>
        ) : (
          <div 
            onClick={addChapter}
            className="h-full flex flex-col items-center justify-center text-earth/40 rounded-2xl border-2 border-dashed border-border-subtle m-10 p-12 bg-white/20 hover:bg-white/40 hover:border-sage/40 transition-all cursor-pointer group"
          >
            <PenTool className="w-12 h-12 text-earth/20 group-hover:text-sage/60 group-hover:scale-110 transition-all mb-4" />
            <p className="font-serif italic text-2xl mb-2 group-hover:text-earth transition-colors">Pen a new chapter to begin.</p>
            <p className="text-xs uppercase tracking-widest text-earth/30 font-bold">Click here to write your first page</p>
          </div>
        )}
      </div>

      {/* Sidebar Right - AI & Notes */}
      <div className="w-80 border-l border-border-subtle bg-sidebar p-8 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="w-4 h-4 text-sage" />
          <h4 className="section-header uppercase mb-0">Ethereal Council (AI)</h4>
        </div>

        <button
          onClick={askAi}
          disabled={isAiLoading}
          className="w-full py-4 bg-earth text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-sage transition-all mb-8 disabled:opacity-50 shadow-md shadow-earth/10"
        >
          {isAiLoading ? "Consulting..." : "Invoke Muse"}
          <Sparkles className="w-4 h-4" />
        </button>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          {aiResult ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/80 rounded-2xl p-6 border border-border-subtle shadow-sm"
            >
              <div className="sidebar-markdown">
                <ReactMarkdown>{aiResult}</ReactMarkdown>
              </div>
            </motion.div>
          ) : (
            <div className="text-center py-20 px-6 border border-dashed border-border-subtle rounded-2xl bg-paper/30">
               <div className="text-xs font-bold text-earth/30 uppercase tracking-[2px]">Suggestions will appear here</div>
            </div>
          )}
          
          <div className="mt-12">
            <div className="section-header">Scene Notes</div>
            {activeChapter ? (
              <textarea
                value={activeChapter.notes || ""}
                onChange={(e) => handleUpdate({ notes: e.target.value })}
                className="w-full bg-white/50 rounded-xl p-5 border border-border-subtle text-xs leading-[1.6] text-earth/80 focus:outline-none focus:ring-1 focus:ring-sage/40 min-h-[140px] resize-y placeholder:italic placeholder:text-earth/30 font-sans"
                placeholder="The Oak is a conduit for the old gods. Elara doesn't know she's carrying the catalyst..."
              />
            ) : (
              <div className="bg-white/30 rounded-xl p-5 border border-dashed border-border-subtle text-xs leading-[1.6] text-earth/40 italic text-center font-sans">
                Select or create a chapter to begin drafting scene notes.
              </div>
            )}
            <button
              onClick={() => {
                if (!activeChapter) return;
                const currentNotes = activeChapter.notes || "";
                const newNote = currentNotes.trim() 
                  ? (currentNotes.endsWith("\n") ? currentNotes + "• " : currentNotes + "\n• ") 
                  : "• ";
                handleUpdate({ notes: newNote });
                // Focus the textarea if it can be found or just rely on state update
              }}
              disabled={!activeChapter}
              className="mt-4 w-full p-4 border border-dashed border-sage/40 rounded-xl flex items-center justify-center text-[10px] font-bold text-sage uppercase tracking-widest cursor-pointer hover:bg-sage/5 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
               + Add Plot Point
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App ---

function NewStoryModal({ isOpen, onClose, onCreate }: { isOpen: boolean, onClose: () => void, onCreate: (title: string, genre: string) => void }) {
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-earth/20 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl p-10 max-w-md w-full shadow-2xl border border-border-subtle"
      >
        <h3 className="font-serif text-3xl text-earth mb-2">New Manuscript</h3>
        <p className="text-sm text-earth/50 mb-8">Set the foundations for your next story.</p>
        
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-earth/40 mb-2">Title</label>
            <input
              autoFocus
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-paper rounded-xl px-5 py-3 border border-border-subtle focus:outline-none focus:ring-2 focus:ring-sage/20 font-serif text-lg"
              placeholder="The Name of the Wind..."
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-widest text-earth/40 mb-2">Genre</label>
            <input
              type="text"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              className="w-full bg-paper rounded-xl px-5 py-3 border border-border-subtle focus:outline-none focus:ring-2 focus:ring-sage/20 text-sm"
              placeholder="e.g. High Fantasy, Noir, Historical..."
            />
          </div>
        </div>

        <div className="flex gap-4 mt-10">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-sm font-bold text-earth/40 hover:text-earth transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!title.trim()}
            onClick={() => {
              onCreate(title, genre);
              setTitle("");
              setGenre("");
            }}
            className="flex-1 py-4 bg-sage text-white rounded-xl font-bold hover:shadow-lg hover:shadow-sage/20 transition-all disabled:opacity-30"
          >
            Create
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    return auth.onAuthStateChanged((u) => {
      setUser(u);
      if (!u) setSelectedStory(null);
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setStories([]);
      return;
    }
    // Remove orderBy to avoid index requirement errors
    const q = query(
      collection(db, "stories"),
      where("authorId", "==", user.uid)
    );
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Story));
      // Sort in memory instead
      setStories(data.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
    });
  }, [user]);

  const handleCreate = async (title: string, genre: string) => {
    if (!user) return;
    try {
      const newStoryData = {
        title: title.trim(),
        description: "",
        genre: genre || "General Fiction",
        authorId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, "stories"), newStoryData);
      
      // Update local state briefly for a smooth transition
      setSelectedStory({ 
        ...newStoryData, 
        id: docRef.id,
        createdAt: { seconds: Date.now() / 1000 },
        updatedAt: { seconds: Date.now() / 1000 }
      } as any);
      
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Story creation failed:", error);
      alert(`Permission error or index missing: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-paper font-sans selection:bg-olive/20 selection:text-olive">
      <Navbar user={user} />
      
      <main>
        {!user ? (
          <Landing />
        ) : selectedStory ? (
          <Editor story={selectedStory} onBack={() => setSelectedStory(null)} />
        ) : (
          <Dashboard stories={stories} onCreate={() => setIsModalOpen(true)} onSelect={setSelectedStory} />
        )}
      </main>

      <NewStoryModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCreate={handleCreate} 
      />

      <footer className="mt-auto py-12 px-6 border-t border-ink/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-30">
            <BookOpen className="w-4 h-4" />
            <span className="font-serif text-sm font-semibold tracking-tight uppercase">Inkwell</span>
          </div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-ink/20">
            © 2026 Inkwell Laboratories. All Manuscripts Protected.
          </div>
        </div>
      </footer>
    </div>
  );
}
