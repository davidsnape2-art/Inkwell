import React, { useState, useEffect, useRef } from "react";
import { auth, signIn, signOut, isOfflineMode } from "./lib/firebase";
import { User } from "firebase/auth";
import { LogIn, LogOut, BookOpen, PenTool, Sparkles, Trash2, ChevronRight, Save, Plus, AlertTriangle, Eye, RefreshCw, Layers, Check, Users, UserPlus, FileText, Download, BookMarked, Tag } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, orderBy } from "firebase/firestore";
import { db } from "./lib/firebase";
import { Story, Chapter, CharacterProfile, LoreEntry, OutlineItem } from "./types";
import { cn, getAISuggestion, getAIReview, generateNext, modifySelection } from "./lib/utils";
import ReactMarkdown from "react-markdown";
import { jsPDF } from "jspdf";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { KeyboardTriggerExtension } from "./lib/KeyboardTriggerExtension";
import { LorebookDrawer } from "./components/LorebookDrawer";

// --- Components ---

function CharacterCard({ 
  character, 
  onUpdate, 
  onDelete 
}: { 
  character: CharacterProfile, 
  onUpdate: (id: string, fields: Partial<CharacterProfile>) => Promise<void>, 
  onDelete: (id: string) => Promise<void> 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(character.name);
  const [role, setRole] = useState(character.role);
  const [traits, setTraits] = useState(character.traits);

  const handleSave = async () => {
    if (!name.trim()) return;
    await onUpdate(character.id, { name: name.trim(), role: role.trim(), traits: traits.trim() });
    setIsEditing(false);
  };

  return (
    <div className="bg-white/80 border border-border-subtle rounded-2xl p-5 shadow-sm space-y-3 relative group transition-all hover:bg-white">
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-[9px] uppercase font-bold tracking-widest text-earth/50 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-paper px-3 py-1.5 border border-border-subtle rounded-lg text-xs font-serif focus:outline-none focus:ring-1 focus:ring-sage/40 text-earth"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold tracking-widest text-earth/50 mb-1">Role / Archetype</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-paper px-3 py-1.5 border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sage/40 text-earth"
              placeholder="e.g. Protagonist, Rebel, Mysterious Hermit"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold tracking-widest text-earth/50 mb-1">Traits, Goals & Lore</label>
            <textarea
              value={traits}
              onChange={(e) => setTraits(e.target.value)}
              className="w-full bg-paper px-3 py-1.5 border border-border-subtle rounded-lg text-xs min-h-[70px] resize-y focus:outline-none focus:ring-1 focus:ring-sage/40 text-earth font-serif leading-relaxed"
              placeholder="Fiercely loyal, holds secret knowledge..."
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-earth/45 hover:text-earth transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-sage text-white text-[10px] uppercase tracking-wider font-bold rounded-lg hover:bg-earth transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-start gap-2">
            <div>
              <h5 className="font-serif text-sm text-earth font-semibold leading-tight">{character.name}</h5>
              <span className="text-[9px] uppercase font-bold text-sage tracking-widest mt-0.5 block">{character.role}</span>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-earth/40 hover:text-earth transition-colors"
                title="Edit Character"
              >
                <PenTool className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete the character profile for ${character.name}?`)) {
                    onDelete(character.id);
                  }
                }}
                className="p-1 text-earth/40 hover:text-red-600 transition-colors"
                title="Delete Character"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          {character.traits && (
            <p className="text-xs text-ink/75 mt-2.5 font-serif italic leading-relaxed whitespace-pre-wrap">{character.traits}</p>
          )}
        </div>
      )}
    </div>
  );
}

function AddCharacterForm({ onAdd }: { onAdd: (name: string, role: string, traits: string) => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [traits, setTraits] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await onAdd(name, role, traits);
    setName("");
    setRole("");
    setTraits("");
    setIsOpen(false);
  };

  return (
    <div className="space-y-4">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full py-3 border border-dashed border-sage text-sage rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-sage/10 transition-all font-sans text-xs uppercase tracking-wider bg-white/30"
        >
          <UserPlus className="w-4 h-4" />
          Add Character Profile
        </button>
      ) : (
        <div className="bg-white/80 p-5 rounded-2xl border border-border-subtle space-y-4 animate-fade-in text-earth shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-border-subtle/50">
            <span className="text-[10px] uppercase font-bold tracking-wider text-earth/50">New Character Profile</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[10px] uppercase font-bold text-earth/40 hover:text-earth"
            >
              Cancel
            </button>
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold tracking-widest text-earth/50 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-paper px-3 py-2 border border-border-subtle rounded-xl text-xs font-serif focus:outline-none focus:ring-1 focus:ring-sage/40 text-earth"
              placeholder="e.g. David Vance"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold tracking-widest text-earth/50 mb-1">Role / Archetype</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full bg-paper px-3 py-2 border border-border-subtle rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-sage/40 text-earth"
              placeholder="e.g. Protagonist, Secret Keeper"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold tracking-widest text-earth/50 mb-1">Traits & Lore</label>
            <textarea
              value={traits}
              onChange={(e) => setTraits(e.target.value)}
              className="w-full bg-paper px-3 py-2 border border-border-subtle rounded-xl text-xs min-h-[85px] resize-y focus:outline-none focus:ring-1 focus:ring-sage/40 text-earth font-serif leading-relaxed"
              placeholder="Ambitious, slightly paranoid, looking for the last copy of the lost volume..."
            />
          </div>
          <button
            disabled={!name.trim()}
            onClick={handleCreate}
            className="w-full py-2.5 bg-sage text-white rounded-xl font-bold hover:bg-earth transition-all disabled:opacity-35 text-xs text-center uppercase tracking-wider shadow-md shadow-sage/10"
          >
            Create Profile
          </button>
        </div>
      )}
    </div>
  );
}

function LoreEntryCard({ 
  entry, 
  onUpdate, 
  onDelete 
}: { 
  entry: LoreEntry, 
  onUpdate: (id: string, fields: Partial<LoreEntry>) => Promise<void>, 
  onDelete: (id: string) => Promise<void> 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [keyword, setKeyword] = useState(entry.keyword);
  const [description, setDescription] = useState(entry.description);

  const handleSave = async () => {
    if (!keyword.trim()) return;
    await onUpdate(entry.id, { keyword: keyword.trim(), description: description.trim() });
    setIsEditing(false);
  };

  return (
    <div className="bg-white/80 border border-border-subtle rounded-2xl p-5 shadow-sm space-y-3 relative group transition-all hover:bg-white animate-fade-in">
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="block text-[9px] uppercase font-bold tracking-widest text-earth/50 mb-1">Keyword / Entity Name</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full bg-paper px-3 py-1.5 border border-border-subtle rounded-lg text-xs font-serif focus:outline-none focus:ring-1 focus:ring-sage/40 text-earth"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold tracking-widest text-earth/50 mb-1">Description / Details</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-paper px-3 py-1.5 border border-border-subtle rounded-lg text-xs min-h-[70px] resize-y focus:outline-none focus:ring-1 focus:ring-sage/40 text-earth font-serif leading-relaxed"
              placeholder="Lead driver. Wears red gloves, calm under pressure..."
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 text-[10px] uppercase tracking-wider font-bold text-earth/45 hover:text-earth transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-sage text-white text-[10px] uppercase tracking-wider font-bold rounded-lg hover:bg-earth transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-start gap-2">
            <div>
              <h5 className="font-serif text-sm text-earth font-semibold leading-tight">{entry.keyword}</h5>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 text-earth/40 hover:text-earth transition-colors"
                title="Edit Lore Entry"
              >
                <PenTool className="w-3 h-3" />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete the lore entry for "${entry.keyword}"?`)) {
                    onDelete(entry.id);
                  }
                }}
                className="p-1 text-earth/40 hover:text-red-600 transition-colors"
                title="Delete Lore Entry"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
          {entry.description && (
            <p className="text-xs text-ink/75 mt-2 font-serif italic leading-relaxed whitespace-pre-wrap">{entry.description}</p>
          )}
        </div>
      )}
    </div>
  );
}

function AddLoreEntryForm({ onAdd }: { onAdd: (keyword: string, description: string) => Promise<void> }) {
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!keyword.trim()) return;
    await onAdd(keyword, description);
    setKeyword("");
    setDescription("");
    setIsOpen(false);
  };

  return (
    <div className="space-y-4">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full py-3 border border-dashed border-sage text-sage rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-sage/10 transition-all font-sans text-xs uppercase tracking-wider bg-white/30"
        >
          <Plus className="w-4 h-4" />
          Add Lore/World Entry
        </button>
      ) : (
        <div className="bg-white/80 p-5 rounded-2xl border border-border-subtle space-y-4 animate-fade-in text-earth shadow-sm">
          <div className="flex justify-between items-center pb-2 border-b border-border-subtle/50">
            <span className="text-[10px] uppercase font-bold tracking-wider text-earth/50">New Lore Entry</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[10px] uppercase font-bold text-earth/40 hover:text-earth"
            >
              Cancel
            </button>
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold tracking-widest text-earth/50 mb-1">Keyword / Entity Name</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full bg-paper px-3 py-2 border border-border-subtle rounded-xl text-xs font-serif focus:outline-none focus:ring-1 focus:ring-sage/40 text-earth"
              placeholder="e.g. Brian, Blackwood Forest, Elder Tree"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase font-bold tracking-widest text-earth/50 mb-1">Description & Lore</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-paper px-3 py-2 border border-border-subtle rounded-xl text-xs min-h-[85px] resize-y focus:outline-none focus:ring-1 focus:ring-sage/40 text-earth font-serif leading-relaxed"
              placeholder="e.g. Lead driver. Wears red gloves, calm under pressure."
            />
          </div>
          <button
            disabled={!keyword.trim()}
            onClick={handleCreate}
            className="w-full py-2.5 bg-sage text-white rounded-xl font-bold hover:bg-earth transition-all disabled:opacity-35 text-xs text-center uppercase tracking-wider shadow-md shadow-sage/10"
          >
            Create Lore Entry
          </button>
        </div>
      )}
    </div>
  );
}

function ReadabilityAnalysis({ content }: { content: string }) {
  if (!content || !content.trim()) {
    return (
      <div className="bg-white/40 border border-border-subtle rounded-2xl p-6 text-center">
        <PenTool className="w-5 h-5 text-earth/20 mx-auto mb-2" />
        <p className="text-[10px] font-bold text-earth/40 uppercase tracking-[2px] leading-relaxed">
          Draft prose to calculate readability metrics
        </p>
      </div>
    );
  }

  // Count words
  const words = content.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  // Let's count alphanumeric characters
  const charCount = content.replace(/\s/g, "").length;

  // Count sentences
  const sentences = content
    .split(/[.!?]+(?:\s+|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  const sentenceCount = sentences.length || 1;

  const avgSentenceLength = wordCount / sentenceCount;

  // Automated Readability Index (ARI) Formula
  let ari = 4.71 * (charCount / wordCount) + 0.5 * (wordCount / sentenceCount) - 21.43;
  ari = Math.max(1, Math.min(14, ari));

  const roundedGrade = Math.round(ari);
  
  let gradeCategory = "";
  let gradeInterpretation = "";
  if (roundedGrade <= 5) {
    gradeCategory = "Junior Prose";
    gradeInterpretation = "Highly accessible structure and simple phrasings.";
  } else if (roundedGrade <= 8) {
    gradeCategory = "Middle-Grade";
    gradeInterpretation = "Balanced modern prose style suitable for wide reach.";
  } else if (roundedGrade <= 10) {
    gradeCategory = "Contemporary Fiction";
    gradeInterpretation = "Excellent, balanced structure for mainstream & literary novels.";
  } else if (roundedGrade <= 12) {
    gradeCategory = "Advanced Literary";
    gradeInterpretation = "Stylistically dense framing with rich intellectual syntax.";
  } else {
    gradeCategory = "Academic / Ornate";
    gradeInterpretation = "Complex, slow-burn phrasings and highly sophisticated patterns.";
  }

  let flowCategory = "";
  let flowInterpretation = "";
  if (avgSentenceLength < 12) {
    flowCategory = "Punchy & Dynamic";
    flowInterpretation = "Short, rapid phrasings that favor dialogue and action sequences.";
  } else if (avgSentenceLength <= 20) {
    flowCategory = "Balanced Standard";
    flowInterpretation = "A pleasant, melodic cadence with natural descriptive pauses.";
  } else if (avgSentenceLength <= 28) {
    flowCategory = "Atmospheric & Long";
    flowInterpretation = "Longer phrasings tailored for sensory, world-building, and pacing depth.";
  } else {
    flowCategory = "Intricate / Heavy";
    flowInterpretation = "Extremely ornate syntax that demands careful pacing focus.";
  }

  return (
    <div className="bg-white/80 border border-border-subtle rounded-2xl p-5 shadow-sm space-y-4 text-earth">
      <div className="flex items-center gap-2 pb-2 border-b border-border-subtle/50">
        <FileText className="w-3.5 h-3.5 text-sage" />
        <span className="text-[10px] uppercase font-bold tracking-widest text-earth/50">Prose Metrics</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Metric 1: Grade Level */}
        <div className="bg-paper p-3 rounded-xl border border-border-subtle/50 space-y-1">
          <span className="block text-[9px] uppercase tracking-wider font-bold text-earth/40">Readability Grade</span>
          <div className="font-serif text-lg font-bold text-sage">{ari.toFixed(1)}</div>
          <span className="block text-[9px] font-sans font-medium text-earth/60 leading-tight">
            {gradeCategory}
          </span>
        </div>

        {/* Metric 2: Average Sentence Length */}
        <div className="bg-paper p-3 rounded-xl border border-border-subtle/50 space-y-1">
          <span className="block text-[9px] uppercase tracking-wider font-bold text-earth/40">Sentence Span</span>
          <div className="font-serif text-lg font-bold text-sage">
            {avgSentenceLength.toFixed(1)} <span className="text-[9px] font-sans font-normal text-earth/45">words</span>
          </div>
          <span className="block text-[9px] font-sans font-medium text-earth/60 leading-tight">
            {flowCategory}
          </span>
        </div>
      </div>

      {/* Details list */}
      <div className="space-y-2.5 text-[11px] font-serif border-t border-border-subtle/30 pt-3">
        <div className="flex justify-between items-center text-earth/70">
          <span>Words count:</span>
          <span className="font-sans font-medium text-xs">{wordCount}</span>
        </div>
        <div className="flex justify-between items-center text-earth/70">
          <span>Sentence count:</span>
          <span className="font-sans font-medium text-xs">{sentenceCount}</span>
        </div>
        
        {/* Progress gauge visual indicator */}
        <div className="pt-2">
          <div className="flex justify-between text-[9px] uppercase tracking-wider text-earth/40 font-sans font-bold mb-1.5">
            <span>Pacing & Cadence Gauge</span>
            <span>{avgSentenceLength.toFixed(0)} wps</span>
          </div>
          <div className="w-full bg-earth/10 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-sage h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (avgSentenceLength / 35) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[8px] text-earth/30 font-sans mt-0.5">
            <span>Punchy (&lt; 12)</span>
            <span>Balanced (12-20)</span>
            <span>Ornate (20+)</span>
          </div>
        </div>

        <div className="bg-paper/50 rounded-xl p-3 text-[11px] italic leading-relaxed text-earth/70 border border-border-subtle/30 mt-2 font-serif text-balance">
          {gradeInterpretation} {flowInterpretation}
        </div>
      </div>
    </div>
  );
}

function Navbar({ user, onBrandClick, onLoginSuccess }: { user: any; onBrandClick?: () => void; onLoginSuccess: (user: any) => void }) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const u = await signIn();
      if (u) {
        onLoginSuccess(u);
      }
    } catch (err) {
      console.error("Auth helper failed, falling back to local guest scribe:", err);
      const fallbackGuest = {
        uid: "local_scribe_guest",
        displayName: "Local Guest Scribe",
        isAnonymous: true,
      };
      localStorage.setItem("inkwell_guest_user", JSON.stringify(fallbackGuest));
      onLoginSuccess(fallbackGuest);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <nav className="border-b border-border-subtle py-4 px-6 flex justify-between items-center bg-paper/80 backdrop-blur-md sticky top-0 z-50">
      <div 
        className={cn(
          "flex items-center gap-2",
          onBrandClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
        )}
        onClick={onBrandClick}
      >
        <BookOpen className="w-6 h-6 text-sage" />
        <span className="font-serif text-2xl font-light tracking-tight text-earth italic">StorySmith</span>
      </div>
      <div className="flex items-center gap-4">
        {isOfflineMode && (
          <span className="text-xs bg-sage/10 text-sage font-mono px-3 py-1 rounded-full animate-pulse border border-sage/20 hidden md:inline-block">
            Offline Mode
          </span>
        )}
        {user && onBrandClick && (
          <button
            onClick={onBrandClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-sage/10 text-sage hover:bg-sage hover:text-white transition-all rounded-xl text-xs font-semibold"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Library</span>
          </button>
        )}
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium opacity-60 hidden sm:block text-earth">{user.displayName || "Guest Scholar"}</span>
            <button
              onClick={() => signOut()}
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

function Landing({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleStart = async () => {
    setIsSigningIn(true);
    try {
      const u = await signIn();
      if (u) {
        onLoginSuccess(u);
      } else {
        const fallbackGuest = {
          uid: "local_scribe_guest",
          displayName: "Local Guest Scribe",
          isAnonymous: true,
        };
        localStorage.setItem("inkwell_guest_user", JSON.stringify(fallbackGuest));
        onLoginSuccess(fallbackGuest);
      }
    } catch (err) {
      console.error("Landing sign-in failed, falling back to local guest scribe:", err);
      const fallbackGuest = {
        uid: "local_scribe_guest",
        displayName: "Local Guest Scribe",
        isAnonymous: true,
      };
      localStorage.setItem("inkwell_guest_user", JSON.stringify(fallbackGuest));
      onLoginSuccess(fallbackGuest);
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
          {isOfflineMode 
            ? "Offline Mode active: Your manuscripts are securely preserved in your offline local storage."
            : "Supports instant automatic fallback guest workspace if popup is blocked"}
        </motion.p>
      </div>
    </div>
  );
}

function Dashboard({ 
  stories, 
  onCreate, 
  onSelect,
  onInstantCreate
}: { 
  stories: Story[], 
  onCreate: () => void, 
  onSelect: (s: Story) => void,
  onInstantCreate: (title: string, genre: string, desc: string, initContent: string) => Promise<void>
}) {
  const blueprints = [
    {
      title: "The Whispering Oak",
      genre: "Epic Fantasy",
      description: "An ancient forest holds secrets to a forgotten age, and Elara must carry the catalyst to safety.",
      initContent: "The wind rustled through the ancient branches of the oak tree, carrying with it the scent of fresh rain and old magic. Elara gripped the silver vial tightly in her hand, feeling the warm pulse of the catalyst within. They were coming for her, she knew, but she had to survive."
    },
    {
      title: "Neon Pulse",
      genre: "Sci-Fi / Cyberpunk",
      description: "Under the towering arches of Neo-Kowloon, a cybernetic courier uncovers an encrypted drive containing the key to the city’s sub-grid controls.",
      initContent: "Rain fell in sheets of heavy, radioactive grey, slicking the alloy streets of Neo-Kowloon in a persistent, shimmering mirror. Jaxon woven his mag-cycle through the gridlocked cargo haulers, his mechanical eyes locked onto the green tracking node glowing in his peripheral interface."
    },
    {
      title: "A Shadow in Paris",
      genre: "Historical Mystery",
      description: "In the foggy streets of 1890 Paris, an eccentric detective follows a trail of clockwork keys left by an elusive thief.",
      initContent: "Gaslights sputtered under the heavy fog that rolled off the Seine. Inspector Robert pulled his heavy wool coat tighter against the chill, his leather-gloved fingers brushing the small, brass gear tucked into his pocket. It was the third clockwork key this week, left in plain sight."
    }
  ];

  const writingPrompts = [
    "Focus deeply on sensory details (sounds, visual textures, lighting) to let scenes breathe.",
    "Analyze the character's internal thoughts and the immediate physical surroundings before moving plot lines forward.",
    "Show, don't tell: Do not rush to resolve a conflict. Focus on cadence, sentence length, and pacing.",
    "Ensure prose voices are contextually seamless with the established story architecture.",
    "Maintain raw story prose: Avoid any clinical conversational filler, introductions, or markdown headers."
  ];

  const [totalChapters, setTotalChapters] = useState(0);
  const [totalLore, setTotalLore] = useState(0);
  const [scratchpad, setScratchpad] = useState(() => {
    return localStorage.getItem("inkwell_scratchpad") || "";
  });
  const [promptIndex, setPromptIndex] = useState(0);
  const [greeting, setGreeting] = useState("Welcome back, Scribe.");

  useEffect(() => {
    // Generate organic time-based greeting
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting("Good morning, Scribe. The morning air resides, and the canvas remains clean.");
    } else if (hour < 18) {
      setGreeting("Good afternoon, Scribe. The ink is fresh; focus on visual textures and let scenes breathe.");
    } else {
      setGreeting("Good evening, Scribe. The gaslights sputter, and your characters begin to whispers.");
    }

    // Read total chapters count
    try {
      const storedChs = localStorage.getItem("inkwell_chapters");
      if (storedChs) {
        setTotalChapters(JSON.parse(storedChs).length);
      }
    } catch (_) {}

    // Read total lore elements
    try {
      const storedLore = localStorage.getItem("inkwell_lorebook");
      if (storedLore) {
        setTotalLore(JSON.parse(storedLore).length);
      }
    } catch (_) {}
  }, [stories]);

  const handleScratchpadChange = (val: string) => {
    setScratchpad(val);
    localStorage.setItem("inkwell_scratchpad", val);
  };

  const nextPrompt = () => {
    setPromptIndex((prev) => (prev + 1) % writingPrompts.length);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Immersive Welcome Hero */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-border-subtle gap-6 animate-fade-in">
        <div>
          <div className="text-[10px] uppercase tracking-[2px] text-sage font-extrabold mb-1">Creative Suite Studio</div>
          <h2 className="font-serif text-4xl text-earth italic font-light max-w-2xl leading-tight">
            {greeting}
          </h2>
        </div>
        <button
          onClick={onCreate}
          className="flex items-center gap-2.5 px-6 py-3 bg-sage text-white rounded-xl font-bold tracking-wide hover:bg-earth transition-all cursor-pointer shadow-md shadow-sage/10 text-xs uppercase"
        >
          <PenTool className="w-4 h-4" />
          Create Custom Manuscript
        </button>
      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white/40 border border-border-subtle rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-sage/10 rounded-xl">
            <BookOpen className="w-5 h-5 text-sage" />
          </div>
          <div>
            <div className="text-[20px] font-serif font-semibold text-earth">{stories.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-earth/50 font-bold">Manuscripts Active</div>
          </div>
        </div>

        <div className="bg-white/40 border border-border-subtle rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3.5 bg-earth/5 rounded-xl">
            <Layers className="w-5 h-5 text-earth/70" />
          </div>
          <div>
            <div className="text-[20px] font-serif font-semibold text-earth">{totalChapters || (stories.length * 1)}</div>
            <div className="text-[10px] uppercase tracking-wider text-earth/50 font-bold">Chapters Penned</div>
          </div>
        </div>

        <div className="bg-white/40 border border-border-subtle rounded-2xl p-5 col-span-2 md:col-span-1 flex items-center gap-4">
          <div className="p-3.5 bg-sage/10 rounded-xl">
            <BookMarked className="w-5 h-5 text-sage" />
          </div>
          <div>
            <div className="text-[20px] font-serif font-semibold text-earth">{totalLore || 2}</div>
            <div className="text-[10px] uppercase tracking-wider text-earth/50 font-bold">World Chronicles</div>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* Left 2 Cols: Manuscripts and Blueprints */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Section: Your Selected Works */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] uppercase font-bold text-earth/40 tracking-[2px] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-earth/40" /> Your Active Archives
              </span>
            </div>

            {stories.length === 0 ? (
              <div className="border border-dashed border-border-subtle rounded-3xl p-16 text-center bg-white/50 mb-10">
                <BookOpen className="w-10 h-10 text-earth/20 mx-auto mb-4" />
                <h4 className="font-serif text-2xl text-earth mb-2">Your Archive is Empty</h4>
                <p className="text-earth/60 max-w-md mx-auto text-sm leading-relaxed font-sans mb-6">
                  Establish a custom workspace from scratch, or kickstart your imagination with one of our curated high-concept story blueprints.
                </p>
                <button
                  onClick={onCreate}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-earth text-white rounded-xl font-medium hover:bg-sage transition-all text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  Create Custom Manuscript
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {stories.map((story) => (
                  <motion.div
                    key={story.id}
                    layoutId={story.id}
                    onClick={() => onSelect(story)}
                    className="group cursor-pointer bg-white border border-border-subtle hover:border-sage/40 rounded-2xl p-8 hover:shadow-xl hover:shadow-earth/[0.03] transition-all flex flex-col justify-between min-h-[220px]"
                  >
                    <div>
                      <span className="text-[9px] uppercase tracking-[1.5px] text-sage font-extrabold mb-4 block">
                        {story.genre || "GENERAL FICTION"}
                      </span>
                      <h3 className="font-serif text-2xl mb-2 text-earth group-hover:text-sage transition-colors leading-tight font-medium">
                        {story.title}
                      </h3>
                      <p className="text-earth/60 line-clamp-3 text-xs leading-relaxed mb-6 font-serif italic">
                        {story.description || "Open workspace to define character lore and start drafting chapter paragraphs..."}
                      </p>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-border-subtle/50">
                      <span className="text-[9px] uppercase font-bold text-earth/30 tracking-wider">
                        Updated {story.updatedAt?.seconds ? new Date(story.updatedAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                      </span>
                      <div className="flex items-center gap-1 text-[10px] uppercase font-bold text-earth/50 group-hover:text-sage transition-colors">
                        <span>Pen Story</span>
                        <ChevronRight className="w-3.5 h-3.5 text-earth/20 group-hover:translate-x-1 group-hover:text-sage transition-all" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Start Writing Instantly from a Blueprint */}
          <div className="pt-4 border-t border-border-subtle/40">
            <span className="text-[10px] uppercase font-bold text-sage tracking-[2px] mb-6 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sage" /> Start Writing Instantly from a Blueprint
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {blueprints.map((bp) => (
                <div
                  key={bp.title}
                  onClick={() => onInstantCreate(bp.title, bp.genre, bp.description, bp.initContent)}
                  className="group cursor-pointer bg-white border border-border-subtle hover:border-sage/40 rounded-2xl p-6 hover:shadow-xl hover:shadow-earth/[0.03] transition-all flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[8px] uppercase tracking-[1.5px] text-sage font-extrabold mb-3 block">
                      {bp.genre}
                    </span>
                    <h4 className="font-serif text-xl mb-2 text-earth group-hover:text-sage transition-colors leading-tight font-medium">
                      {bp.title}
                    </h4>
                    <p className="text-ink/65 text-[11px] leading-relaxed mb-5 font-serif italic line-clamp-3">
                      {bp.description}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-border-subtle/40 flex justify-between items-center text-[9px] uppercase font-bold text-earth/50 group-hover:text-sage transition-colors">
                    <span>Quick Draft</span>
                    <ChevronRight className="w-3 h-3 text-earth/20 group-hover:translate-x-1 group-hover:text-sage transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right 1 Col: Desk Accessories & Persistence Pad */}
        <div className="space-y-8">
          
          {/* Custom Brainstorm Note Pad */}
          <div className="bg-white border border-border-subtle rounded-2xl p-6 shadow-sm flex flex-col justify-between min-h-[300px]">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className="w-4 h-4 text-sage" />
                <h4 className="font-serif text-lg text-earth font-medium">Desk Note Scratchpad</h4>
              </div>
              <p className="text-[10px] text-earth/50 leading-relaxed font-sans mb-4">
                Rapid scene thoughts, character snippets, and local narrative guidelines. Data is auto-saved.
              </p>
              
              <textarea
                value={scratchpad}
                onChange={(e) => handleScratchpadChange(e.target.value)}
                placeholder="Type brainstorming thoughts or story snippets here..."
                className="w-full bg-paper border border-border-subtle/70 rounded-xl p-4 text-xs font-serif leading-relaxed min-h-[180px] focus:outline-none focus:ring-1 focus:ring-sage/40 text-earth placeholder-earth/30 resize-none"
              />
            </div>
            
            <div className="pt-3 border-t border-border-subtle/40 text-[9px] uppercase tracking-wider font-bold text-sage/80 flex items-center justify-between">
              <span>● Status Offline / Local Only</span>
              <span className="text-[10px]">{scratchpad.length} Chars</span>
            </div>
          </div>

          {/* Prompt / Daily Inspiration Widget */}
          <div className="bg-sage/10 rounded-2xl p-6 border border-sage/20 relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[9px] uppercase tracking-[1.5px] font-extrabold text-sage flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-sage" /> Scribe Guidelines
                </span>
                <button 
                  onClick={nextPrompt}
                  className="p-1 hover:bg-sage/10 rounded-lg text-sage transition-colors cursor-pointer"
                  title="Next Cue"
                >
                  <RefreshCw className="w-3.5 h-3.5 pointer-events-auto" />
                </button>
              </div>
              
              <p className="font-serif text-earth text-sm italic leading-relaxed mb-4 min-h-[60px]">
                "{writingPrompts[promptIndex]}"
              </p>
            </div>

            <div className="text-[9px] text-earth/45 font-sans">
              Designed as Inkwell's Elite Co-Writer Guidelines.
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

function Editor({ 
  story, 
  onBack, 
  isLoreOpen, 
  setIsLoreOpen, 
  lorebook, 
  setLorebook, 
  handleUpdateLorebook 
}: { 
  story: Story; 
  onBack: () => void; 
  isLoreOpen: boolean; 
  setIsLoreOpen: (open: boolean) => void; 
  lorebook: LoreEntry[]; 
  setLorebook: React.Dispatch<React.SetStateAction<LoreEntry[]>>; 
  handleUpdateLorebook: (updated: LoreEntry[]) => void; 
}) {
  const isLocalStorageMode = isOfflineMode || story.authorId === "local_scribe_guest";
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- Chapter Outline Beat Sheet States & Persistence ---
  const [outlines, setOutlines] = useState<Record<string, OutlineItem[]>>(() => {
    const saved = localStorage.getItem('inkwell_outlines');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse inkwell_outlines", e);
      }
    }
    return {
      'mock-1': [
        { id: 'b1', text: 'Establish the oppressive, melting heat of the racing tarmac', completed: true },
        { id: 'b2', text: 'Introduce an unexpected vibration coming from the steering column', completed: false },
        { id: 'b3', text: 'Force a sudden defensive driving maneuver as a rival cuts inside', completed: false }
      ]
    };
  });
  const [newBeatText, setNewBeatText] = useState("");

  useEffect(() => {
    localStorage.setItem('inkwell_outlines', JSON.stringify(outlines));
  }, [outlines]);

  // --- Chapter Outline Beat Sheet Mutators ---
  const handleAddBeat = (text: string) => {
    if (!activeChapter || !text.trim()) return;
    const newItem: OutlineItem = {
      id: "beat_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 5),
      text: text.trim(),
      completed: false
    };
    setOutlines(prev => ({
      ...prev,
      [activeChapter.id]: [...(prev[activeChapter.id] || []), newItem]
    }));
  };

  const toggleBeat = (beatId: string) => {
    if (!activeChapter) return;
    setOutlines(prev => ({
      ...prev,
      [activeChapter.id]: (prev[activeChapter.id] || []).map(beat => 
        beat.id === beatId ? { ...beat, completed: !beat.completed } : beat
      )
    }));
  };

  const deleteBeat = (beatId: string) => {
    if (!activeChapter) return;
    setOutlines(prev => ({
      ...prev,
      [activeChapter.id]: (prev[activeChapter.id] || []).filter(beat => beat.id !== beatId)
    }));
  };
  
  const [directorsNote, setDirectorsNote] = useState("");
  const [isCoWriting, setIsCoWriting] = useState(false);

  const [isModifyingSelection, setIsModifyingSelection] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"enhance" | "pacing" | "dialogue" | "">("");

  // Helper to convert plain text with custom newlines to html for Tiptap
  const textToHtml = (text: string): string => {
    if (!text) return "";
    return text
      .split(/\n\n+/)
      .map(p => {
        const cleaned = p.trim();
        if (!cleaned) return "";
        return `<p>${cleaned.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />")}</p>`;
      })
      .filter(Boolean)
      .join("");
  };

  const INKWELL_STORAGE_KEY = "inkwell_editor_draft";
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const coWriteTriggerRef = useRef<() => void>(() => {});

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "The words began to flow like a river...",
      }),
      KeyboardTriggerExtension.configure({
        onTrigger: () => {
          coWriteTriggerRef.current();
        },
      }),
    ],
    content: "",
    onUpdate: ({ editor }) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      setSaveStatus("saving");
      
      saveTimeoutRef.current = setTimeout(async () => {
        const plainText = editor.getText({ blockSeparator: "\n\n" });
        const currentHTML = editor.getHTML();
        
        if (activeChapter) {
          localStorage.setItem(`${INKWELL_STORAGE_KEY}_${activeChapter.id}`, currentHTML);
        } else {
          localStorage.setItem(INKWELL_STORAGE_KEY, currentHTML);
        }

        await handleUpdate({ content: plainText });
        setSaveStatus("saved");
      }, 500);
    },
    editorProps: {
      attributes: {
        class: "prose max-w-none focus:outline-none font-serif text-xl leading-[1.8] text-ink min-h-[350px]",
        style: "outline: none;",
      },
    },
  });

  const lastActiveChapterIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (editor && activeChapter) {
      if (lastActiveChapterIdRef.current !== activeChapter.id) {
        // Flush pending save first before switching
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          const plainText = editor.getText({ blockSeparator: "\n\n" });
          if (lastActiveChapterIdRef.current) {
            setSaveStatus("saving");
            const storedChapters = localStorage.getItem("inkwell_chapters");
            if (isLocalStorageMode && storedChapters) {
              const list = JSON.parse(storedChapters) as Chapter[];
              const idx = list.findIndex(c => c.id === lastActiveChapterIdRef.current);
              if (idx !== -1) {
                list[idx] = { ...list[idx], content: plainText, updatedAt: { seconds: Date.now() / 1000 } };
                localStorage.setItem("inkwell_chapters", JSON.stringify(list));
                window.dispatchEvent(new Event("inkwell_db_changed"));
              }
            } else if (!isLocalStorageMode) {
              const docRef = doc(db, `stories/${story.id}/chapters`, lastActiveChapterIdRef.current);
              updateDoc(docRef, { content: plainText, updatedAt: serverTimestamp() }).catch(console.error);
            }
          }
        }

        lastActiveChapterIdRef.current = activeChapter.id;
        const backupHTML = localStorage.getItem(`${INKWELL_STORAGE_KEY}_${activeChapter.id}`);
        if (backupHTML) {
          editor.commands.setContent(backupHTML);
        } else {
          const htmlContent = textToHtml(activeChapter.content || "");
          editor.commands.setContent(htmlContent);
        }
      }
    } else if (editor && !activeChapter) {
      lastActiveChapterIdRef.current = null;
      editor.commands.clearContent();
    }
  }, [editor, activeChapter?.id]);

  const handleModifySelection = async (action: "enhance" | "pacing" | "dialogue") => {
    if (!editor || isModifyingSelection) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    
    if (!selectedText.trim()) return;
    setIsModifyingSelection(true);
    setSelectedAction(action);
    try {
      const fullText = editor.getText({ blockSeparator: "\n\n" });
      const { replacement } = await modifySelection(fullText, selectedText, action);
      if (replacement) {
        editor.chain().focus().insertContentAt({ from, to }, replacement.trim()).run();
        
        // Push update to parent & database
        const updatedContent = editor.getText({ blockSeparator: "\n\n" });
        await handleUpdate({ content: updatedContent });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to modify the selected text. Please verify your connection.");
    } finally {
      setIsModifyingSelection(false);
      setSelectedAction("");
    }
  };

  const handleCoWriteContinuation = async () => {
    if (!editor || !activeChapter) return;
    const currentText = editor.getText({ blockSeparator: "\n\n" });
    if (!currentText.trim()) return;
    setIsCoWriting(true);

    const activeChecklist = outlines[activeChapter.id] || [];
    const remainingBeats = activeChecklist
      .filter(beat => !beat.completed)
      .map(beat => beat.text);

    try {
      const { suggestion } = await generateNext(currentText, directorsNote.trim(), lorebook, remainingBeats);
      if (suggestion && suggestion.trim()) {
        editor.chain().focus("end").insertContent(`<p>${suggestion.trim()}</p>`).run();
        setDirectorsNote("");
        
        // Push update to database
        const updatedContent = editor.getText({ blockSeparator: "\n\n" });
        await handleUpdate({ content: updatedContent });
      }
    } catch (err) {
      console.error(err);
      alert("Failed to continue your story. Please verify your connection.");
    } finally {
      setIsCoWriting(false);
    }
  };

  useEffect(() => {
    coWriteTriggerRef.current = handleCoWriteContinuation;
  }, [directorsNote, isCoWriting, outlines, lorebook]);

  useEffect(() => {
    const handleSlashTrigger = (event: Event) => {
      const customEvent = event as CustomEvent<{ action: string }>;
      const actionType = customEvent.detail.action;

      if (actionType === "ai-continue") {
        console.log("Slash Command triggered automated continuation sequence...");
        handleCoWriteContinuation(); // Fires the existing API call
      } else if (actionType === "ai-scenery") {
        // You can expand your backend API payload routes to handle descriptive scenic tasks later!
        console.log("Generate background sensory profiles...");
      }
    };

    window.addEventListener("inkwell-slash-command", handleSlashTrigger);
    return () => window.removeEventListener("inkwell-slash-command", handleSlashTrigger);
  }, [editor, chapters, activeChapter?.id, directorsNote, outlines, lorebook]); // Keep dependencies refreshed for structural auto-saves
  
  const [activeTab, setActiveTab] = useState<"muse" | "outline" | "checker" | "characters" | "lorebook">("outline");
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [reviewLoadingStep, setReviewLoadingStep] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);

  useEffect(() => {
    if (saveStatus === "saved") {
      const timer = setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  useEffect(() => {
    if (!isReviewLoading) {
      setReviewLoadingStep(0);
      return;
    }
    const interval = setInterval(() => {
      setReviewLoadingStep((prev) => (prev + 1) % 5);
    }, 4000);
    return () => clearInterval(interval);
  }, [isReviewLoading]);

  useEffect(() => {
    if (!story?.id) return;

    if (isLocalStorageMode) {
      const loadCharacters = () => {
        const stored = localStorage.getItem("inkwell_characters");
        if (stored) {
          try {
            const list = JSON.parse(stored) as CharacterProfile[];
            const filtered = list.filter(c => c.storyId === story.id);
            // Sort by name
            const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
            setCharacters(sorted);
          } catch (e) {
            console.error("Failed to parse local characters", e);
          }
        } else {
          setCharacters([]);
        }
      };
      loadCharacters();
      window.addEventListener("inkwell_db_changed", loadCharacters);
      return () => {
        window.removeEventListener("inkwell_db_changed", loadCharacters);
      };
    }

    const q = query(collection(db, `stories/${story.id}/characters`));
    return onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as CharacterProfile));
      const sorted = data.sort((a, b) => a.name.localeCompare(b.name));
      setCharacters(sorted);
    }, (error) => {
      console.error("Characters subscription failed:", error);
    });
  }, [story.id]);



  const addCharacter = async (name: string, role: string, traits: string) => {
    try {
      const newChar = {
        storyId: story.id,
        name: name.trim() || "New Character",
        role: role.trim() || "Secondary Character",
        traits: traits.trim() || "Intriguing traits...",
        createdAt: isLocalStorageMode ? { seconds: Date.now() / 1000 } : serverTimestamp(),
        updatedAt: isLocalStorageMode ? { seconds: Date.now() / 1000 } : serverTimestamp(),
      };

      if (isLocalStorageMode) {
        const id = "char_" + Math.random().toString(36).substring(2, 9);
        const stored = localStorage.getItem("inkwell_characters");
        const list = stored ? JSON.parse(stored) : [];
        list.push({ ...newChar, id });
        localStorage.setItem("inkwell_characters", JSON.stringify(list));
        window.dispatchEvent(new Event("inkwell_db_changed"));
      } else {
        await addDoc(collection(db, `stories/${story.id}/characters`), newChar);
      }
    } catch (error: any) {
      console.error("Character addition failed:", error);
      alert(`Could not add character: ${error.message || error}`);
    }
  };

  const updateCharacter = async (charId: string, fields: Partial<CharacterProfile>) => {
    try {
      if (isLocalStorageMode) {
        const stored = localStorage.getItem("inkwell_characters");
        if (stored) {
          const list = JSON.parse(stored) as CharacterProfile[];
          const idx = list.findIndex(c => c.id === charId);
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...fields, updatedAt: { seconds: Date.now() / 1000 } };
            localStorage.setItem("inkwell_characters", JSON.stringify(list));
            window.dispatchEvent(new Event("inkwell_db_changed"));
          }
        }
      } else {
        const docRef = doc(db, `stories/${story.id}/characters`, charId);
        await updateDoc(docRef, { ...fields, updatedAt: serverTimestamp() });
      }
    } catch (error: any) {
      console.error("Character update failed:", error);
    }
  };

  const deleteCharacter = async (charId: string) => {
    try {
      if (isLocalStorageMode) {
        const stored = localStorage.getItem("inkwell_characters");
        if (stored) {
          const list = JSON.parse(stored) as CharacterProfile[];
          const filtered = list.filter(c => c.id !== charId);
          localStorage.setItem("inkwell_characters", JSON.stringify(filtered));
          window.dispatchEvent(new Event("inkwell_db_changed"));
        }
      } else {
        const docRef = doc(db, `stories/${story.id}/characters`, charId);
        await deleteDoc(docRef);
      }
    } catch (error: any) {
      console.error("Character deletion failed:", error);
    }
  };

  const addLoreEntry = async (keyword: string, description: string) => {
    try {
      const newEntry: LoreEntry = {
        id: "lore_" + Math.random().toString(36).substring(2, 9),
        storyId: story.id,
        keyword: keyword.trim() || "New Keyword",
        description: description.trim() || "Details...",
        createdAt: { seconds: Date.now() / 1000 },
        updatedAt: { seconds: Date.now() / 1000 },
      };
      const updated = [...lorebook, newEntry];
      handleUpdateLorebook(updated);
    } catch (error: any) {
      console.error("Lore entry addition failed:", error);
    }
  };

  const updateLoreEntry = async (id: string, fields: Partial<LoreEntry>) => {
    try {
      const updated = lorebook.map(entry => entry.id === id ? { ...entry, ...fields, updatedAt: { seconds: Date.now() / 1000 } } : entry);
      handleUpdateLorebook(updated);
    } catch (error: any) {
      console.error("Lore entry update failed:", error);
    }
  };

  const deleteLoreEntry = async (id: string) => {
    try {
      const updated = lorebook.filter(entry => entry.id !== id);
      handleUpdateLorebook(updated);
    } catch (error: any) {
      console.error("Lore entry deletion failed:", error);
    }
  };

  useEffect(() => {
    if (!story?.id) return;

    if (isLocalStorageMode) {
      const loadChapters = () => {
        const stored = localStorage.getItem("inkwell_chapters");
        if (stored) {
          try {
            const list = JSON.parse(stored) as Chapter[];
            const filtered = list.filter(c => c.storyId === story.id);
            const sorted = filtered.sort((a, b) => a.order - b.order);
            setChapters(sorted);
            if (sorted.length > 0 && !activeChapter) setActiveChapter(sorted[0]);
          } catch (e) {
            console.error("Failed to parse local chapters", e);
          }
        } else {
          setChapters([]);
        }
      };
      loadChapters();
      window.addEventListener("inkwell_db_changed", loadChapters);
      return () => {
        window.removeEventListener("inkwell_db_changed", loadChapters);
      };
    }

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
        authorId: auth.currentUser?.uid || "local_scribe_guest",
        createdAt: isLocalStorageMode ? { seconds: Date.now() / 1000 } : serverTimestamp(),
        updatedAt: isLocalStorageMode ? { seconds: Date.now() / 1000 } : serverTimestamp(),
      };

      let id = "";
      if (isLocalStorageMode) {
        id = "chapter_" + Math.random().toString(36).substring(2, 9);
        const stored = localStorage.getItem("inkwell_chapters");
        const list = stored ? JSON.parse(stored) : [];
        const finalChapter = { ...newChapter, id };
        list.push(finalChapter);
        localStorage.setItem("inkwell_chapters", JSON.stringify(list));
        window.dispatchEvent(new Event("inkwell_db_changed"));
      } else {
        const docRef = await addDoc(collection(db, `stories/${story.id}/chapters`), newChapter);
        id = docRef.id;
      }
      setActiveChapter({ ...newChapter, id } as Chapter);
    } catch (error: any) {
      console.error("Chapter creation failed:", error);
      alert(`Could not create chapter: ${error.message || error}`);
    }
  };

  const handleUpdate = async (fields: Partial<Chapter>) => {
    if (!activeChapter) return;
    setSaveStatus("saving");
    try {
      if (isLocalStorageMode) {
        const stored = localStorage.getItem("inkwell_chapters");
        if (stored) {
          const list = JSON.parse(stored) as Chapter[];
          const idx = list.findIndex(c => c.id === activeChapter.id);
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...fields, updatedAt: { seconds: Date.now() / 1000 } };
            localStorage.setItem("inkwell_chapters", JSON.stringify(list));
            window.dispatchEvent(new Event("inkwell_db_changed"));
          }
        }
      } else {
        const docRef = doc(db, `stories/${story.id}/chapters`, activeChapter.id);
        await updateDoc(docRef, { ...fields, updatedAt: serverTimestamp() });
      }
      setActiveChapter(prev => prev ? ({ ...prev, ...fields }) : null);
      setSaveStatus("saved");
    } catch (error: any) {
      console.error("Chapter update failed:", error);
      setSaveStatus("idle");
    }
  };

  const handleExportPDF = () => {
    if (!activeChapter) return;
    
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const marginX = 25;
      const marginY = 30;
      const contentWidth = pageWidth - (marginX * 2); // 160mm
      
      // Choose Times font for a classic, sophisticated manuscript feeling
      doc.setFont("Times", "normal");
      
      let currentY = marginY;
      
      // Simple helper to add a page and draw headers
      const addPageWithHeader = () => {
        doc.addPage();
        doc.setFont("Times", "italic");
        doc.setFontSize(9);
        doc.setTextColor(140, 130, 115); // soft warm brown-earth tone
        // Top running head
        doc.text(`${story.title}   |   ${activeChapter.title || "Draft"}`, marginX, 15);
        // Draw a very subtle top rule line
        doc.setDrawColor(220, 215, 205);
        doc.setLineWidth(0.1);
        doc.line(marginX, 17, pageWidth - marginX, 17);
        
        doc.setFont("Times", "normal");
        return marginY;
      };

      // --- Cover / Title Header for Page 1 ---
      // Subtitle/Story metadata
      doc.setFont("Times", "italic");
      doc.setFontSize(10);
      doc.setTextColor(100, 95, 85);
      doc.text(`From the manuscript: "${story.title}"`, marginX, currentY);
      currentY += 8;

      // Title of the Chapter
      doc.setFont("Times", "bold");
      doc.setFontSize(24);
      doc.setTextColor(40, 35, 30); // deep warm charcoal
      
      // Wrap title just in case it's extremely long
      const rawTitle = activeChapter.title || "Untitled Chapter";
      const wrappedTitle = doc.splitTextToSize(rawTitle, contentWidth);
      wrappedTitle.forEach((line: string) => {
        if (currentY > pageHeight - marginY) {
          currentY = addPageWithHeader();
        }
        doc.text(line, marginX, currentY);
        currentY += 10;
      });
      
      currentY += 5;

      // Draw a sleek, elegant separator line
      doc.setDrawColor(180, 170, 150); // warm sand tone
      doc.setLineWidth(0.5);
      doc.line(marginX, currentY, pageWidth - marginX, currentY);
      currentY += 15;

      // --- Chapter Body ---
      doc.setFont("Times", "normal");
      doc.setFontSize(11);
      doc.setTextColor(50, 48, 45); // highly readable deep charcoal

      const textAndParagraphs = (activeChapter.content || "").split("\n");
      
      textAndParagraphs.forEach((paragraph) => {
        const trimmed = paragraph.trim();
        if (!trimmed) {
          // Empty paragraph serves as a paragraph break spacing
          currentY += 6;
          return;
        }

        // Split text to fit line width
        const lines = doc.splitTextToSize(trimmed, contentWidth);
        
        lines.forEach((line: string) => {
          // Check if we need a new page
          if (currentY > pageHeight - marginY) {
            currentY = addPageWithHeader();
            doc.setFont("Times", "normal");
            doc.setFontSize(11);
            doc.setTextColor(50, 48, 45);
          }
          
          // Print the line
          doc.text(line, marginX, currentY);
          currentY += 6.5; // beautiful comfortable line-height for a 11pt font
        });
        
        // extra spacing between paragraphs for contemporary readability
        currentY += 3.5;
      });

      // --- Add Page Numbers to Footers on all pages ---
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("Times", "normal");
        doc.setFontSize(9);
        doc.setTextColor(140, 130, 115);
        // Draw a simple, beautiful footer
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 15, { align: "center" });
      }

      // Save the PDF matching the chapter's title or general "manuscript"
      const cleanStoryTitle = story.title.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
      const cleanChapterTitle = (activeChapter.title || "Chapter").trim().replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `${cleanStoryTitle}_-_${cleanChapterTitle}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Failed to export as PDF. Please try again.");
    }
  };

  const askAi = async () => {
    if (!story) return;
    setIsAiLoading(true);
    setAiResult("");
    try {
      const charactersText = characters.length > 0
        ? "\n\nSTORY CHARACTERS:\n" + characters.map(c => `- Name: ${c.name}\n  Role: ${c.role}\n  Traits: ${c.traits}`).join("\n")
        : "";

      // Create a solid context block defining story properties and scene details
      const storyContext = `
Title: ${story.title}
Genre: ${story.genre || "General Fiction"}
Description: ${story.description || "No description provided"}
Active Chapter: ${activeChapter?.title || "Draft"}
Scene Notes: ${activeChapter?.notes || "No draft notes available"}
      `.trim() + charactersText;

      const prompt = activeChapter?.content 
        ? `Review the existing text (current draft length: ${activeChapter.content.length} characters):
"${activeChapter.content.slice(0, 3000)}"

Develop three highly evocative continuing paths. Optimize suggestions referencing our registered characters if appropriate. Organize your suggestions exactly into these matching headings:

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

  const checkPlotHoles = async () => {
    if (!activeChapter || !activeChapter.content.trim()) return;
    setIsReviewLoading(true);
    try {
      const charactersText = characters.length > 0
        ? "\n\nSTORY CHARACTERS PROFILE:\n" + characters.map(c => `- Name: ${c.name}\n  Role: ${c.role}\n  Traits: ${c.traits}`).join("\n")
        : "";

      const storyContext = `
Story Title: ${story.title}
Story Genre: ${story.genre || "General Fiction"}
Story Description: ${story.description || "No description provided"}
Active Chapter Title: ${activeChapter.title || "Unnamed Chapter"}
Chapter Notes: ${activeChapter.notes || "No draft notes available"}
      `.trim() + charactersText;

      const { review } = await getAIReview(activeChapter.content, storyContext);
      await handleUpdate({ review });
    } catch (err) {
      console.error(err);
      alert("Could not request plot hole check. Please verify your connection.");
    } finally {
      setIsReviewLoading(false);
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
                  <div
                    key={c.id}
                    onClick={() => setActiveChapter(c)}
                    className={cn(
                      "nav-item-natural w-full text-left flex items-center transition-all cursor-pointer py-2 px-3.5 rounded-xl border border-transparent",
                      activeChapter?.id === c.id 
                        ? "bg-sage/10 text-sage border-sage/10 shadow-xs" 
                        : "text-ink/60 hover:bg-earth/[0.02]"
                    )}
                  >
                    {activeChapter?.id === c.id ? (
                      <input
                        value={c.title}
                        onChange={(e) => handleUpdate({ title: e.target.value })}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-transparent border-none text-sage font-medium text-sm w-full outline-none focus:ring-0 p-0"
                        placeholder="Untitled Chapter"
                      />
                    ) : (
                      <span className="font-medium text-sm truncate">{c.title || "Untitled Chapter"}</span>
                    )}
                  </div>
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

        <div className="flex items-center justify-between mb-8 gap-4 min-h-[24px]">
          <div className="breadcrumb text-xs text-earth opacity-40 uppercase tracking-widest font-bold">
            Archive / {story.title} / {activeChapter?.title || "Draft"}
          </div>
          <div className="flex items-center gap-4">
            <AnimatePresence mode="wait">
              {saveStatus !== "idle" && (
                <motion.div
                  key={saveStatus}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] font-sans font-medium tracking-wide",
                    saveStatus === "saving" ? "text-earth/40" : "text-sage"
                  )}
                >
                  {saveStatus === "saving" ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin opacity-60" />
                      <span>Saving manuscript...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3 text-sage stroke-[2.5px]" />
                      <span>Autosaved</span>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {activeChapter && (
              <div className="flex items-center gap-2">
                <button
                  id="toggle-lore-drawer-btn"
                  onClick={() => setIsLoreOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-earth hover:bg-sage text-white rounded-xl text-[10px] font-sans font-bold uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
                  title="Open Sliding Lorebook Drawer"
                >
                  <BookMarked className="w-3 h-3" />
                  <span>Brain / Lore</span>
                </button>

                <button
                  id="export-pdf-btn"
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-earth/[0.02] border border-border-subtle rounded-xl text-[10px] font-sans font-bold uppercase tracking-wider text-earth hover:text-sage hover:border-sage/40 transition-all shadow-sm active:scale-95 shrink-0"
                  title="Export Chapter to Clean PDF"
                >
                  <Download className="w-3 h-3" />
                  <span>Export PDF</span>
                </button>
              </div>
            )}
          </div>
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
            
            {editor && (
              <BubbleMenu
                editor={editor}
                options={{ placement: "top" }}
              >
                <div className="flex bg-earth/95 backdrop-blur-md rounded-xl p-1.5 shadow-xl border border-earth/20 gap-1">
                  <button
                    onClick={() => handleModifySelection("enhance")}
                    disabled={isModifyingSelection}
                    className="px-3.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-wider text-paper hover:bg-sage transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isModifyingSelection && selectedAction === "enhance" ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Refining...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>Sensory & Atmos</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleModifySelection("pacing")}
                    disabled={isModifyingSelection}
                    className="px-3.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-wider text-paper hover:bg-sage transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isModifyingSelection && selectedAction === "pacing" ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Pacing...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3 h-3" />
                        <span>Narrative Pacing</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleModifySelection("dialogue")}
                    disabled={isModifyingSelection}
                    className="px-3.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-sans font-bold uppercase tracking-wider text-paper hover:bg-sage transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isModifyingSelection && selectedAction === "dialogue" ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Speech...</span>
                      </>
                    ) : (
                      <>
                        <PenTool className="w-3 h-3" />
                        <span>Spoken Dialogue</span>
                      </>
                    )}
                  </button>
                </div>
              </BubbleMenu>
            )}

            <div className="font-serif text-xl w-full flex-1 bg-transparent leading-[1.8] text-ink min-h-[350px] outline-none">
              <EditorContent editor={editor} />
            </div>
            
            {/* Elite Co-Writer action bar */}
            <div className="mt-8 pt-6 border-t border-earth/10 flex flex-col gap-5">
              {/* Optional Director's Note guidance */}
              <div className="bg-white/[0.4] backdrop-blur-xs border border-earth/5 hover:border-earth/10 rounded-xl p-4 transition-all duration-300 flex flex-col gap-2 shadow-xs group">
                <label className="text-[10px] font-sans font-extrabold uppercase tracking-widest text-earth/50 group-focus-within:text-sage transition-colors flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sage inline-block animate-pulse"></span>
                  Director's Note (Optional guidance for next paragraph)
                </label>
                <input
                  type="text"
                  value={directorsNote}
                  onChange={(e) => setDirectorsNote(e.target.value)}
                  placeholder="e.g., A sudden downpour starts, or Brian checks his mirrors nervously..."
                  className="w-full bg-transparent text-sm font-sans placeholder:text-earth/25 focus:outline-none text-earth border-b border-earth/10 focus:border-sage/40 pb-1 transition-all"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-earth/50 font-mono flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-sage" />
                  <span>{activeChapter.content ? activeChapter.content.trim().split(/\s+/).filter(Boolean).length : 0} words</span>
                </div>
                
                <button
                  onClick={handleCoWriteContinuation}
                  disabled={isCoWriting || !activeChapter.content.trim()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-earth hover:bg-sage text-paper rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 hover:shadow-lg hover:shadow-sage/15"
                >
                  {isCoWriting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mimicking your style...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Seamless Elite Co-Writer Continuation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
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
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border-subtle mb-6 pb-2">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("muse")}
              className={cn(
                "text-xs uppercase tracking-wider font-bold pb-2 transition-all border-b-2",
                activeTab === "muse"
                  ? "border-sage text-sage"
                  : "border-transparent text-earth/30 hover:text-earth/60"
              )}
            >
              Muse
            </button>
            <button
              onClick={() => setActiveTab("outline")}
              className={cn(
                "text-xs uppercase tracking-wider font-bold pb-2 transition-all border-b-2 flex items-center gap-1.5",
                activeTab === "outline"
                  ? "border-sage text-sage"
                  : "border-transparent text-earth/30 hover:text-earth/60"
              )}
            >
              Outline
            </button>
            <button
              onClick={() => setActiveTab("checker")}
              className={cn(
                "text-xs uppercase tracking-wider font-bold pb-2 transition-all border-b-2 flex items-center gap-1.5",
                activeTab === "checker"
                  ? "border-sage text-sage"
                  : "border-transparent text-earth/30 hover:text-earth/60"
              )}
            >
              Plot Audit
            </button>
            <button
              onClick={() => setActiveTab("characters")}
              className={cn(
                "text-xs uppercase tracking-wider font-bold pb-2 transition-all border-b-2 flex items-center gap-1.5",
                activeTab === "characters"
                  ? "border-sage text-sage"
                  : "border-transparent text-earth/30 hover:text-earth/60"
              )}
            >
              Characters
            </button>
            <button
              onClick={() => setActiveTab("lorebook")}
              className={cn(
                "text-xs uppercase tracking-wider font-bold pb-2 transition-all border-b-2 flex items-center gap-1.5",
                activeTab === "lorebook"
                  ? "border-sage text-sage"
                  : "border-transparent text-earth/30 hover:text-earth/60"
              )}
            >
              Lore
            </button>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-sage/60" />
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
          {activeTab === "muse" ? (
            <div className="space-y-6">
              <button
                onClick={askAi}
                disabled={isAiLoading}
                className="w-full py-4 bg-earth text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-sage transition-all disabled:opacity-50 shadow-md shadow-earth/10"
              >
                {isAiLoading ? "Consulting..." : "Invoke Muse"}
                <Sparkles className="w-4 h-4" />
              </button>

              {aiResult ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white/80 rounded-2xl p-6 border border-border-subtle shadow-sm animate-fade-in"
                >
                  <div className="sidebar-markdown">
                    <ReactMarkdown>{aiResult}</ReactMarkdown>
                  </div>
                </motion.div>
              ) : (
                <div className="text-center py-16 px-6 border border-dashed border-border-subtle rounded-2xl bg-paper/30 animate-fade-in">
                  <BookOpen className="w-5 h-5 text-earth/20 mx-auto mb-3" />
                  <div className="text-[10px] font-bold text-earth/40 uppercase tracking-[2px] leading-relaxed">
                    Tap Muse to spark continuing paths or start hooks
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "outline" ? (
            <div className="space-y-6 animate-fade-in text-earth">
              <div className="bg-white/80 rounded-2xl p-6 border border-border-subtle shadow-xs">
                <h3 className="text-sm font-serif italic text-earth mb-1">📋 Chapter Beat Sheet</h3>
                <p className="text-[11px] text-earth/60/80 leading-relaxed font-sans mt-1">
                  Unchecked plot beats actively guide Gemini's co-writing memory to keep the story on track.
                </p>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newBeatText.trim()) return;
                    handleAddBeat(newBeatText);
                    setNewBeatText("");
                  }} 
                  className="mt-4 flex gap-2"
                >
                  <input 
                    type="text"
                    value={newBeatText}
                    onChange={(e) => setNewBeatText(e.target.value)}
                    placeholder="New beat or plot point..."
                    className="flex-1 px-3 py-2 bg-paper border border-border-subtle rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sage/40 text-earth font-sans"
                  />
                  <button 
                    type="submit"
                    className="p-2 bg-sage hover:bg-earth text-white rounded-lg transition-all"
                    title="Add Beat"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              <div className="space-y-4 pt-2">
                <span className="text-[10px] uppercase font-bold text-sage tracking-widest flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-sage" /> Roadmap Beats ({activeChapter ? (outlines[activeChapter.id] || []).length : 0})
                </span>

                {!activeChapter ? (
                  <div className="text-center py-12 px-5 border border-dashed border-border-subtle rounded-2xl bg-paper/20 animate-fade-in">
                    <AlertTriangle className="w-5 h-5 text-earth/20 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-earth/45 uppercase tracking-[2px] leading-relaxed">
                      Select a chapter to review outlines!
                    </p>
                  </div>
                ) : (outlines[activeChapter.id] || []).length === 0 ? (
                  <div className="text-center py-12 px-5 border border-dashed border-border-subtle rounded-2xl bg-paper/20 animate-fade-in">
                    <Layers className="w-5 h-5 text-earth/20 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-earth/45 uppercase tracking-[2px] p-2 leading-relaxed">
                      No plot beats logged. Write story roadmap beats above to steer continuing draft streams!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    {(outlines[activeChapter.id] || []).map((beat) => (
                      <div 
                        key={beat.id}
                        className={cn(
                          "flex items-start gap-3 p-3.5 rounded-xl transition-all border",
                          beat.completed 
                            ? "bg-earth/[0.01] border-border-subtle/40" 
                            : "bg-white border-sage/10 hover:border-sage/25 shadow-xs"
                        )}
                      >
                        <input 
                          type="checkbox"
                          checked={beat.completed}
                          onChange={() => toggleBeat(beat.id)}
                          className="mt-0.5 rounded text-sage focus:ring-sage/40 cursor-pointer h-3.5 w-3.5 border-border-subtle accent-sage"
                        />
                        <span className={cn(
                          "flex-1 text-xs leading-relaxed transition-all font-sans",
                          beat.completed 
                            ? "line-through text-earth/30" 
                            : "text-earth font-medium"
                        )}>
                          {beat.text}
                        </span>
                        <button 
                          onClick={() => deleteBeat(beat.id)}
                          className="p-0.5 text-earth/30 hover:text-earth transition-colors"
                          title="Remove plot point"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "checker" ? (
            <div className="space-y-6 animate-fade-in">
              {!activeChapter ? (
                <div className="text-center py-16 px-6 border border-dashed border-border-subtle rounded-2xl bg-paper/30">
                  <Eye className="w-5 h-5 text-earth/20 mx-auto mb-3" />
                  <div className="text-[10px] font-bold text-earth/40 uppercase tracking-[2px]">
                    Select a chapter to run a plot audit
                  </div>
                </div>
              ) : !activeChapter.content.trim() ? (
                <div className="text-center py-16 px-6 border border-dashed border-border-subtle rounded-2xl bg-paper/30">
                  <PenTool className="w-5 h-5 text-earth/20 mx-auto mb-3" />
                  <div className="text-[10px] font-bold text-earth/40 uppercase tracking-[2px] leading-relaxed">
                    Write chapter content to run a plot hole audit
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <ReadabilityAnalysis content={activeChapter.content} />

                  <button
                    onClick={checkPlotHoles}
                    disabled={isReviewLoading}
                    className="w-full py-4 bg-sage text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-earth transition-all disabled:opacity-50 shadow-md shadow-sage/10"
                  >
                    {isReviewLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Auditing...
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Audit Plot Holes
                      </>
                    )}
                  </button>

                  {isReviewLoading ? (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/55 border border-border-subtle rounded-2xl p-6 text-center space-y-4 shadow-sm"
                    >
                      <div className="flex justify-center">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-sage"></span>
                        </span>
                      </div>
                      <p className="text-xs text-earth/70 font-medium font-serif italic min-h-[40px] duration-500 transition-all flex items-center justify-center">
                        {reviewLoadingStep === 0 && "Submitting draft to the editor..."}
                        {reviewLoadingStep === 1 && "Verifying timeline consistency & plot holes..."}
                        {reviewLoadingStep === 2 && "Evaluating psychological character motivations..."}
                        {reviewLoadingStep === 3 && "Analyzing narrative theme & motifs..."}
                        {reviewLoadingStep === 4 && "Formatting constructive recommendations..."}
                      </p>
                      <div className="w-full bg-earth/10 h-1.5 rounded-full overflow-hidden">
                        <motion.div
                          className="bg-sage h-full rounded-full"
                          initial={{ width: "0%" }}
                          animate={{ width: `${(reviewLoadingStep + 1) * 20}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </motion.div>
                  ) : activeChapter.review ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-sage tracking-widest flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-sage" /> Latest Critique
                        </span>
                        <button
                          onClick={checkPlotHoles}
                          className="text-[10px] text-earth/50 hover:text-earth transition-colors flex items-center gap-1"
                          title="Re-run analysis"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> Re-audit
                        </button>
                      </div>
                      <div className="bg-white/85 rounded-2xl p-6 border border-border-subtle shadow-sm">
                        <div className="sidebar-markdown leading-relaxed">
                          <ReactMarkdown>{activeChapter.review}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center py-16 px-6 border border-dashed border-border-subtle rounded-2xl bg-paper/30">
                      <AlertTriangle className="w-5 h-5 text-earth/20 mx-auto mb-3" />
                      <div className="text-[10px] font-bold text-earth/40 uppercase tracking-[2px] leading-relaxed">
                        No previous audit found. Run an audit to outline mistakes, motivations, and thematic gaps.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeTab === "characters" ? (
            <div className="space-y-6 animate-fade-in text-earth">
              <AddCharacterForm onAdd={addCharacter} />

              <div className="space-y-4 pt-2">
                <span className="text-[10px] uppercase font-bold text-sage tracking-widest flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-sage" /> Defined Characters ({characters.length})
                </span>

                {characters.length === 0 ? (
                  <div className="text-center py-12 px-5 border border-dashed border-border-subtle rounded-2xl bg-paper/20 animate-fade-in">
                    <Users className="w-5 h-5 text-earth/20 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-earth/45 uppercase tracking-[2.5px] leading-relaxed">
                      No profiles registered yet. Craft characters to guide the Muse!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    {characters.map((char) => (
                      <CharacterCard
                        key={char.id}
                        character={char}
                        onUpdate={updateCharacter}
                        onDelete={deleteCharacter}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in text-earth">
              <AddLoreEntryForm onAdd={addLoreEntry} />

              <div className="space-y-4 pt-2">
                <span className="text-[10px] uppercase font-bold text-sage tracking-widest flex items-center gap-1">
                  <BookMarked className="w-3.5 h-3.5 text-sage" /> Lorebook ({lorebook.length})
                </span>

                {lorebook.length === 0 ? (
                  <div className="text-center py-12 px-5 border border-dashed border-border-subtle rounded-2xl bg-paper/20 animate-fade-in">
                    <Tag className="w-5 h-5 text-earth/20 mx-auto mb-2" />
                    <p className="text-[10px] font-bold text-earth/45 uppercase tracking-[2.5px] leading-relaxed">
                      No lore entries registered yet. Craft keys, locations, or items!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    {lorebook.map((entry) => (
                      <LoreEntryCard
                        key={entry.id}
                        entry={entry}
                        onUpdate={updateLoreEntry}
                        onDelete={deleteLoreEntry}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border-subtle">
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
  const [user, setUser] = useState<any | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isLoreOpen, setIsLoreOpen] = useState(false);
  const [lorebook, setLorebook] = useState<LoreEntry[]>(() => {
    try {
      const saved = localStorage.getItem('inkwell_lorebook');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to parse inkwell_lorebook", e);
    }
    return [
      { id: 'mock-1', keyword: 'Brian', description: 'Lead driver. Wears red gloves, calm under pressure.' },
      { id: 'mock-2', keyword: 'Tarmac', description: 'Extremely hot, high deg, melting the soft compound tires.' }
    ];
  });

  const handleUpdateLorebook = (updated: LoreEntry[]) => {
    setLorebook(updated);
    localStorage.setItem('inkwell_lorebook', JSON.stringify(updated));
  };

  useEffect(() => {
    const getCachedLocalUser = () => {
      try {
        const cached = localStorage.getItem("inkwell_guest_user");
        return cached ? JSON.parse(cached) : null;
      } catch (_) {
        return null;
      }
    };

    const explicitlySignedOut = sessionStorage.getItem("inkwell_explicit_sign_out");

    if (isOfflineMode) {
      const checkLocalUser = () => {
        let cached = getCachedLocalUser();
        const loggedOut = sessionStorage.getItem("inkwell_explicit_sign_out");
        
        if (!cached && !loggedOut) {
          const guestUser = {
            uid: "local_scribe_guest",
            displayName: "Local Scribe",
            isAnonymous: true,
          };
          localStorage.setItem("inkwell_guest_user", JSON.stringify(guestUser));
          cached = guestUser;
        }
        
        setUser(cached);
      };
      checkLocalUser();
      window.addEventListener("storage_auth_changed", checkLocalUser);
      return () => {
        window.removeEventListener("storage_auth_changed", checkLocalUser);
      };
    }

    // Initialize with local fallback if guest is already cached
    const localUser = getCachedLocalUser();
    if (localUser && !explicitlySignedOut) {
      setUser(localUser);
    }

    return auth.onAuthStateChanged((u) => {
      const loggedOut = sessionStorage.getItem("inkwell_explicit_sign_out");
      if (u) {
        setUser(u);
      } else if (!loggedOut) {
        // Auto sign-in anonymously for an unimpeded live preview experience
        import("./lib/firebase").then(({ signInGuest }) => {
          signInGuest().then((guest) => {
            setUser(guest);
          }).catch((err) => {
            console.error("Auto guest sign-in failed, falling back to local storage guest:", err);
            const fallbackGuest = {
              uid: "local_scribe_guest",
              displayName: "Local Guest Scribe",
              isAnonymous: true,
            };
            setUser(fallbackGuest);
          });
        });
      } else {
        setUser(null);
        setSelectedStory(null);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) {
      setStories([]);
      return;
    }

    if (isOfflineMode || user.uid === "local_scribe_guest") {
      const loadStories = () => {
        const stored = localStorage.getItem("inkwell_stories");
        if (stored) {
          try {
            const list = JSON.parse(stored) as Story[];
            const filtered = list.filter(s => s.authorId === user.uid);
            setStories(filtered.sort((a, b) => {
              const aTime = a.updatedAt?.seconds || 0;
              const bTime = b.updatedAt?.seconds || 0;
              return bTime - aTime;
            }));
          } catch (e) {
            console.error("Failed to parse local stories", e);
          }
        } else {
          setStories([]);
        }
      };
      loadStories();
      window.addEventListener("inkwell_db_changed", loadStories);
      return () => {
        window.removeEventListener("inkwell_db_changed", loadStories);
      };
    }

    // Remove orderBy to avoid index requirement errors
    try {
      const q = query(
        collection(db, "stories"),
        where("authorId", "==", user.uid)
      );
      return onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Story));
        // Sort in memory instead
        setStories(data.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
      }, (err) => {
        console.warn("Firestore subscription failed. Falling back to offline local manuscript archive seamlessly.", err);
        const stored = localStorage.getItem("inkwell_stories");
        if (stored) {
          try {
            const list = JSON.parse(stored) as Story[];
            const filtered = list.filter(s => s.authorId === user.uid);
            setStories(filtered.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0)));
          } catch (e) {
            console.error("Failed to parse local stories fallback", e);
          }
        } else {
          setStories([]);
        }
      });
    } catch (e) {
      console.error("Firestore setup error", e);
    }
  }, [user]);

  const handleCreate = async (title: string, genre: string, description: string = "", initialChapterContent: string = "") => {
    if (!user) return;
    const isLocalMode = isOfflineMode || user.uid === "local_scribe_guest";
    try {
      const newStoryData = {
        title: title.trim(),
        description: description || "",
        genre: genre || "General Fiction",
        authorId: user.uid,
        createdAt: isLocalMode ? { seconds: Date.now() / 1000 } : serverTimestamp(),
        updatedAt: isLocalMode ? { seconds: Date.now() / 1000 } : serverTimestamp(),
      };
      
      let id = "";
      if (isLocalMode) {
        id = "story_" + Math.random().toString(36).substring(2, 9);
        const stored = localStorage.getItem("inkwell_stories");
        const list = stored ? JSON.parse(stored) : [];
        const finalStory = { ...newStoryData, id };
        list.push(finalStory);
        localStorage.setItem("inkwell_stories", JSON.stringify(list));

        if (initialChapterContent) {
          const starterChapter = {
            id: "chapter_" + Math.random().toString(36).substring(2, 9),
            storyId: id,
            title: "Chapter 1: The Gathering Storm",
            content: initialChapterContent,
            order: 1,
            authorId: user.uid,
            createdAt: { seconds: Date.now() / 1000 },
            updatedAt: { seconds: Date.now() / 1000 },
          };
          const chaptersStored = localStorage.getItem("inkwell_chapters");
          const chaptersList = chaptersStored ? JSON.parse(chaptersStored) : [];
          chaptersList.push(starterChapter);
          localStorage.setItem("inkwell_chapters", JSON.stringify(chaptersList));
        }

        window.dispatchEvent(new Event("inkwell_db_changed"));
      } else {
        const docRef = await addDoc(collection(db, "stories"), newStoryData);
        id = docRef.id;

        if (initialChapterContent) {
          await addDoc(collection(db, `stories/${id}/chapters`), {
            storyId: id,
            title: "Chapter 1: The Gathering Storm",
            content: initialChapterContent,
            order: 1,
            authorId: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      }
      
      // Update local state briefly for a smooth transition
      setSelectedStory({ 
        ...newStoryData, 
        id,
        createdAt: { seconds: Date.now() / 1000 },
        updatedAt: { seconds: Date.now() / 1000 }
      } as any);
      
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Story creation failed:", error);
      alert(`Story creation failed: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-paper font-sans selection:bg-olive/20 selection:text-olive">
      <Navbar user={user} onBrandClick={selectedStory ? () => setSelectedStory(null) : undefined} onLoginSuccess={setUser} />
      
      <main>
        {!user ? (
          <Landing onLoginSuccess={setUser} />
        ) : selectedStory ? (
          <Editor 
            story={selectedStory} 
            onBack={() => setSelectedStory(null)} 
            isLoreOpen={isLoreOpen}
            setIsLoreOpen={setIsLoreOpen}
            lorebook={lorebook}
            setLorebook={setLorebook}
            handleUpdateLorebook={handleUpdateLorebook}
          />
        ) : (
          <Dashboard stories={stories} onCreate={() => setIsModalOpen(true)} onSelect={setSelectedStory} onInstantCreate={handleCreate} />
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

      <LorebookDrawer 
        isOpen={isLoreOpen} 
        onClose={() => setIsLoreOpen(false)} 
        lorebook={lorebook} 
        onUpdateLorebook={handleUpdateLorebook} 
      />
    </div>
  );
}
