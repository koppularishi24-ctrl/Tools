import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";
import * as pdfjsLib from "pdfjs-dist";

// Configure worker using Vite's standard URL pattern
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

import {
  Calendar,
  Clock,
  ArrowRight,
  RefreshCcw,
  Copy,
  Check,
  Search,
  FileSpreadsheet,
  ReceiptText,
  Gamepad2,
  Loader2,
  AlertCircle,
} from "lucide-react";

const getGenAI = () => {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    (typeof import.meta !== "undefined" && (import.meta as any).env && ((import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.GEMINI_API_KEY));
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. If you're hosting on Vercel/GitHub, please add GEMINI_API_KEY (or VITE_GEMINI_API_KEY) to your Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};
import {
  calculateDateDiff,
  getDayInfo,
  calculateALSheet,
  ALSheetResult,
} from "@/src/lib/DateLogic";
import { cn, formatNumber, cleanJsonString } from "@/src/lib/utils";
import { format, isValid, startOfDay, parse } from "date-fns";
import * as XLSX from "xlsx";

type Tab = "diff" | "finder" | "al" | "game";

import { WeatherEffects } from "./components/WeatherEffects";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("diff");

  return (
    <div 
      className="min-h-screen selection:bg-zinc-800 overflow-x-hidden bg-background-image bg-cover bg-center bg-fixed relative"
      style={{ '--bg-image': 'url(/bg.jpg)' } as React.CSSProperties}
    >
      <div className="fixed inset-0 bg-black/50 z-0 pointer-events-none" />
      <WeatherEffects />
      <main className="relative z-10">
        <Hero
          onStart={() =>
            document
              .getElementById("tools")
              ?.scrollIntoView({ behavior: "smooth" })
          }
        />

        <section id="tools" className="py-12 px-4 relative overflow-hidden">
          <div className="max-w-4xl mx-auto">
            <div className="flex justify-center mb-12">
              <div className="glass-card p-1 rounded-xl flex flex-wrap justify-center gap-1 bg-black">
                <TabButton
                  active={activeTab === "diff"}
                  onClick={() => setActiveTab("diff")}
                  icon={<Calendar className="w-4 h-4" />}
                >
                  Date Difference
                </TabButton>
                <TabButton
                  active={activeTab === "finder"}
                  onClick={() => setActiveTab("finder")}
                  icon={<Search className="w-4 h-4" />}
                >
                  Day Finder
                </TabButton>
                <TabButton
                  active={activeTab === "al"}
                  onClick={() => setActiveTab("al")}
                  icon={<FileSpreadsheet className="w-4 h-4" />}
                >
                  Leave Analyzer
                </TabButton>
                <TabButton
                  active={activeTab === "game"}
                  onClick={() => setActiveTab("game")}
                  icon={<Gamepad2 className="w-4 h-4" />}
                >
                  Word Game
                </TabButton>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                {activeTab === "diff" && <DateDifferenceTool />}
                {activeTab === "finder" && <DayFinderTool />}
                {activeTab === "al" && <AnnualLeaveTool />}
                {activeTab === "game" && <WordGameTool />}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* All tools are handled within this main container */}
      </main>
    </div>
  );
}

function Header() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between border-b border-zinc-900">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-white flex items-center justify-center font-display font-bold text-black">
            S
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-white">
            SmartDate
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span className="hidden md:block text-xs font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900/50 px-4 py-1.5 rounded-full border border-zinc-800">
            v2.1 Stable
          </span>
        </div>
      </div>
    </nav>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <section className="relative pt-20 pb-8 px-4 overflow-hidden">
      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-bold tracking-widest uppercase mb-4">
            Refined Productivity Suite
          </span>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-3 tracking-tight leading-[1.1]">
            Simplified Tools
          </h1>
          <p className="text-base md:text-lg text-zinc-500 max-w-2xl mx-auto mb-6 leading-relaxed font-medium">
            A minimalist toolkit to calculate differences, verify weekdays, and
            manage annual leave sheets with precision.
          </p>
          <button
            onClick={onStart}
            className="group px-8 py-3 bg-white text-black rounded-lg text-sm font-bold transition-all hover:bg-zinc-200 active:scale-95 shadow-lg shadow-black/20"
          >
            <span className="flex items-center gap-2">
              Get Started{" "}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </motion.div>
      </div>
    </section>
  );
}

function AnnualLeaveTool() {
  const [results, setResults] = useState<ALSheetResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Upload .xlsx file for leave analysis.");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatus("Analyzing...");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const allResults: ALSheetResult[] = [];

        workbook.SheetNames.forEach((name) => {
          const ws = workbook.Sheets[name];
          const sheetData = XLSX.utils.sheet_to_json(ws, {
            header: 1,
          }) as any[][];
          try {
            const res = calculateALSheet(name, sheetData);
            allResults.push(res);
          } catch (err) {
            console.error(`Error in sheet ${name}:`, err);
          }
        });

        setResults(allResults);
        setStatus(`Processed ${allResults.length} sheet(s).`);
        setLoading(false);
      } catch (err) {
        setStatus("Error processing file.");
        setLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const reset = () => {
    setResults([]);
    setStatus("Upload .xlsx file for leave analysis.");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="glass-card p-10 rounded-md">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-12 h-12 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white mb-6">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="text-3xl font-display font-bold text-white">
            Leave Analysis
          </h3>
          <p className="text-zinc-500 text-base mt-2">
            Multi-sheet detection and leave calculation suite.
          </p>
        </div>

        <div className="space-y-8">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative cursor-pointer border border-zinc-900 hover:bg-zinc-900/50 hover:border-zinc-700 rounded-md p-14 transition-all flex flex-col items-center justify-center bg-black"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <div className="w-12 h-12 rounded bg-black border border-zinc-800 flex items-center justify-center mb-6">
              <FileSpreadsheet className="w-6 h-6 text-zinc-500 group-hover:text-white" />
            </div>
            <span className="text-base font-bold text-zinc-400">
              Select Excel File
            </span>
          </div>

          <div className="flex gap-4">
            <button
              onClick={reset}
              className="flex-1 p-5 rounded-md border border-zinc-800 bg-zinc-900 hover:text-white hover:border-zinc-600 transition-all text-base font-bold uppercase tracking-widest text-zinc-400"
            >
              Clear Workspace
            </button>
          </div>

          <div className="text-center pt-6">
            <span className="text-sm font-mono text-zinc-500">{status}</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {results.map((sheet, si) => (
              <div
                key={si}
                className="glass-card rounded-md overflow-hidden border-zinc-800"
              >
                <div className="bg-zinc-950 px-8 py-6 border-b border-zinc-900 flex justify-between items-center">
                  <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-3">
                    Sheet: {sheet.name}
                  </span>
                  <div className="flex gap-8">
                    <span className="text-sm font-bold text-zinc-100">
                      ENCASH: {sheet.grandEncash}
                    </span>
                    <span className="text-sm font-bold text-zinc-500">
                      EXCESS: {sheet.grandExcess}
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto">
                  {sheet.blocks.map((block, bi) => (
                    <div
                      key={bi}
                      className="p-8 rounded-md border border-zinc-900 space-y-6"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-zinc-600 uppercase">
                          Block {block.index}
                        </span>
                        <span className="text-base font-bold text-white px-4 py-2 rounded-sm bg-zinc-900 border border-zinc-800">
                          {block.verdict}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-6 rounded-sm bg-zinc-950 border border-zinc-900 text-sm text-zinc-500">
                          Journey:{" "}
                          <span className="text-white font-bold ml-1">
                            {block.journeyPeriod}d
                          </span>
                        </div>
                        <div className="p-6 rounded-sm bg-zinc-950 border border-zinc-900 text-sm text-zinc-500">
                          Entitlement:{" "}
                          <span className="text-white font-bold ml-1">
                            {block.alEntitled}d
                          </span>
                        </div>
                      </div>

                      <p className="text-base text-zinc-500 px-1 leading-relaxed">
                        {block.journeyMsg}
                      </p>

                      <div className="flex flex-wrap gap-3 items-center px-1">
                        <span className="text-sm font-bold text-zinc-700 uppercase mr-1">
                          Leaves:
                        </span>
                        {block.leaves.map((l, li) => (
                          <span
                            key={li}
                            className="px-3 py-1.5 rounded-sm bg-zinc-950 text-sm text-zinc-400 border border-zinc-900"
                          >
                            {l}
                          </span>
                        ))}
                      </div>

                      <div className="text-sm text-zinc-500 text-right pt-6 border-t border-zinc-900">
                        Total Leave Counted:{" "}
                        <span className="text-white font-bold ml-1">
                          {block.totalLeaveCounted}d
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ... (Rest of DateDifferenceTool, DayFinderTool, TabButton, ResultCard, Features, FAQ, Footer)
// I'll re-include the existing tools below to ensure the file is complete.

function WordGameTool() {
  const [history, setHistory] = useState<{ word: string; author: "ai" | "user"; definition?: string }[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const startGame = async () => {
    setLoading(true);
    setError(null);
    try {
      const ai = getGenAI();
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Start a word chain game. Give me a single random, interesting English word (common noun). It should be different every time. For this session, pick something unique. Random Seed: ${Math.random().toString(36).substring(7)}. Return ONLY the word, nothing else.`,
      });
      
      const text = response.text || "";
      const matches = text.match(/[a-zA-Z]+/g);
      const word = matches ? matches[matches.length - 1].toLowerCase() : "labyrinth";
      
      setHistory([{ word, author: "ai" }]);
      setGameStarted(true);
    } catch (err: any) {
      console.error("Start Game Error:", err);
      setError(err.message || "Failed to start game. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const submitWord = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || loading) return;

    const word = userInput.trim().toLowerCase();
    const lastWord = history[history.length - 1].word;
    const requiredLetter = lastWord[lastWord.length - 1];

    if (word[0] !== requiredLetter) {
      setError(`Word must start with '${requiredLetter.toUpperCase()}'`);
      return;
    }

    if (history.some(h => h.word === word)) {
      setError("Word already used!");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ai = getGenAI();
      const prompt = `You are a strict English dictionary and word chain game judge.
      The user just typed: "${word}".
      
      Tasks:
      1. CRITICAL: Verify if "${word}" is a real, correctly spelled English dictionary word (must exist in standards like Oxford or Merriam-Webster).
      2. If it is NOT a real English word, set isValid to false and provide a funny/helpful reason.
      3. If it IS valid, provide a NEW English word that starts with "${word.slice(-1)}" which hasn't been used yet.
      
      Used words: ${history.map(h => h.word).join(", ")}.
      
      Return ONLY a JSON object:
      {
        "isValid": boolean,
        "aiWord": "string" (a new word starting with "${word.slice(-1)}"),
        "reason": "string" (only if isValid is false)
      }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const responseText = response.text;
      if (!responseText) throw new Error("No response from AI");
      
      const data = JSON.parse(cleanJsonString(responseText));
      
      if (!data.isValid) {
        setError("You typed a wrong word. Go again!");
        setLoading(false);
        return;
      }

      const aiWord = data.aiWord?.toLowerCase().replace(/[^a-z]/g, "");
      if (!aiWord) throw new Error("AI failed to provide a valid follow-up word.");

      setHistory(prev => [...prev, { word, author: "user" }, { word: aiWord, author: "ai" }]);
      setUserInput("");
    } catch (err: any) {
      console.error("Submit Word Error:", err);
      setError(err.message || "AI failed to respond. Try another word.");
    } finally {
      setLoading(false);
    }
  };

  const skip = async () => {
    if (loading || history.length === 0) return;
    setLoading(true);
    setError(null);
    const lastWord = history[history.length - 1].word;

    try {
      const ai = getGenAI();
      const prompt = `Give me the definition of the word "${lastWord}". 
      Also, give me a NEW random starting word for our word chain game. 
      Seed: ${Math.random().toString(36).substring(7)}
      Return as JSON: { "definition": "string", "newWord": "string" }`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const responseText = response.text;
      if (!responseText) throw new Error("No response from AI");
      
      const data = JSON.parse(cleanJsonString(responseText));
      
      if (!data.newWord) throw new Error("No new word provided");

      setHistory(prev => [
        ...prev.map((h, i) => i === prev.length - 1 ? { ...h, definition: data.definition } : h),
        { word: data.newWord.toLowerCase().replace(/[^a-z]/g, ""), author: "ai" }
      ]);
    } catch (err: any) {
      console.error("Skip Error:", err);
      setError(err.message || "Failed to skip. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!gameStarted) {
    return (
      <div className="glass-card p-10 rounded-md text-center max-w-xl mx-auto">
        <Gamepad2 className="w-12 h-12 mx-auto mb-6 text-white" />
        <h3 className="text-3xl font-display font-bold text-white mb-2">Word Chain</h3>
        <p className="text-zinc-500 mb-8">Test your vocabulary against AI. Keep the chain going!</p>
        <button
          onClick={startGame}
          disabled={loading}
          className="w-full bg-white text-black py-4 rounded-lg font-bold hover:bg-zinc-200 transition-all disabled:opacity-50"
        >
          {loading ? "Starting..." : "Start Game"}
        </button>
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-left leading-relaxed">{error}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="glass-card rounded-md border-zinc-800 h-[500px] flex flex-col bg-black/40">
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800"
        >
          {history.map((item, i) => (
            <motion.div
              initial={{ opacity: 0, x: item.author === "user" ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              key={i}
              className={cn(
                "flex flex-col gap-1",
                item.author === "user" ? "items-end" : "items-start"
              )}
            >
              <div
                className={cn(
                  "px-4 py-2 rounded-2xl max-w-[80%] text-sm font-medium",
                  item.author === "user" 
                    ? "bg-white text-black rounded-tr-none" 
                    : "bg-zinc-800 text-white rounded-tl-none border border-zinc-700"
                )}
              >
                {item.word}
              </div>
              {item.definition && (
                <div className="text-[10px] text-zinc-500 italic max-w-[80%] px-2">
                  {item.definition}
                </div>
              )}
            </motion.div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 px-4 py-2 rounded-2xl border border-zinc-800">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-900 bg-zinc-950/50">
          <form onSubmit={submitWord} className="flex gap-2">
            <input
              value={userInput}
              onChange={(e) => {
                setUserInput(e.target.value);
                setError(null);
              }}
              placeholder={`Starts with '${history[history.length-1].word.slice(-1).toUpperCase()}'...`}
              className="flex-1 bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-zinc-500 transition-colors"
              autoFocus
            />
            <button
              disabled={loading || !userInput.trim()}
              className="bg-white text-black px-6 py-2 rounded-lg font-bold text-sm disabled:opacity-50"
            >
              Send
            </button>
            <button
              type="button"
              onClick={skip}
              disabled={loading}
              className="px-6 py-2 rounded-lg font-bold text-sm border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
            >
              Skip
            </button>
          </form>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-500 text-xs mt-2 ml-1 flex items-center gap-1"
            >
              <AlertCircle className="w-3 h-3" /> {error}
            </motion.p>
          )}
        </div>
      </div>
      
      <div className="text-center">
        <button
          onClick={() => {
            setGameStarted(false);
            setHistory([]);
          }}
          className="text-zinc-600 hover:text-zinc-400 text-xs font-bold uppercase tracking-widest transition-colors"
        >
          Quit Game
        </button>
      </div>
    </div>
  );
}

function DateDifferenceTool() {
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [results, setResults] = useState<ReturnType<
    typeof calculateDateDiff
  > | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [localError, setLocalError] = useState<string>("");

  const calculate = () => {
    setLocalError("");
    if (!fromDate || !toDate) {
      setLocalError("Please enter both 'From' and 'To' dates.");
      return;
    }
    
    const f = parse(fromDate, "yyyy-MM-dd", new Date());
    const t = parse(toDate, "yyyy-MM-dd", new Date());
    
    if (!isValid(f) || !isValid(t)) {
      setLocalError("Please enter valid dates.");
      return;
    }
    
    setResults(calculateDateDiff(f, t));
  };

  const copyResults = () => {
    if (!results) return;
    const text = `Date Difference Analysis:\n${results.summary}\nTotal Days: ${results.totalDays}\nInclusive: ${results.inclusiveDays}\nExclusive: ${results.exclusiveDays}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const reset = () => {
    setFromDate("");
    setToDate("");
    setResults(null);
    setLocalError("");
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="glass-card p-8 rounded-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest ml-1 text-center block">
              From
            </label>
            <input
              type="date"
              lang="en-GB"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-black border border-zinc-900 rounded-xl px-5 py-4 text-base text-white focus:outline-none focus:border-zinc-700 transition-colors text-center [color-scheme:dark]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest ml-1 text-center block">
              To
            </label>
            <input
              type="date"
              lang="en-GB"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-black border border-zinc-900 rounded-xl px-5 py-4 text-base text-white focus:outline-none focus:border-zinc-700 transition-colors text-center [color-scheme:dark]"
            />
          </div>
        </div>

        {localError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-left leading-relaxed">{localError}</span>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={calculate}
            className="flex-1 bg-white px-8 py-4 rounded-xl text-sm font-bold text-black shadow-lg shadow-black/20 hover:bg-zinc-200 active:scale-95 transition-all text-center"
          >
            Calculate Difference
          </button>
          <button
            onClick={reset}
            className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {results && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-3"
          >
            <div className="glass-card p-6 rounded-xl border-zinc-900 bg-black/20 text-center">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                  Summary
                </span>
                <button
                  onClick={copyResults}
                  className="p-1.5 px-3 rounded bg-zinc-900 text-zinc-500 hover:text-white transition-colors flex items-center gap-2"
                >
                  {isCopied ? (
                    <Check className="w-4 h-4 text-white" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span className="text-xs font-bold uppercase">
                    {isCopied ? "Copied" : "Copy Result"}
                  </span>
                </button>
              </div>
              <p className="text-base font-medium text-white">
                {results.summary}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <ResultCard
                label="Total Days"
                value={formatNumber(results.totalDays)}
              />
              <ResultCard
                label="Inclusive"
                value={formatNumber(results.inclusiveDays)}
              />
              <ResultCard
                label="Exclusive"
                value={formatNumber(results.exclusiveDays)}
              />
              <ResultCard
                label="Total Weeks"
                value={`${results.weeks}w ${results.remainingDaysAfterWeeks}d`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ResultCard
                label="Full Breakdown"
                value={`${results.years}y ${results.remainingMonthsAfterYears}m ${results.remainingDaysAfterYearsMonths}d`}
                subtext="Y / M / D"
              />
              <ResultCard
                label="Total Months"
                value={`${results.months} Months`}
                subtext={`+ ${results.remainingDaysAfterMonths} days`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DayFinderTool() {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [info, setInfo] = useState<ReturnType<typeof getDayInfo> | null>(null);
  const [localError, setLocalError] = useState<string>("");

  const find = () => {
    setLocalError("");
    if (!selectedDate) {
      setLocalError("Please enter a target date.");
      setInfo(null);
      return;
    }
    const d = parse(selectedDate, "yyyy-MM-dd", new Date());
    if (isValid(d)) {
      setInfo(getDayInfo(d));
    } else {
      setLocalError("Please enter a valid date.");
      setInfo(null);
    }
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div className="glass-card p-8 rounded-2xl">
        <label className="block text-sm font-bold text-zinc-500 uppercase tracking-widest ml-1 mb-3 text-center">
          Target Date
        </label>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <input
            type="date"
            lang="en-GB"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 bg-black border border-zinc-900 rounded-xl px-5 py-4 text-base text-white focus:outline-none focus:border-zinc-700 transition-colors text-center [color-scheme:dark] h-[58px]"
          />
          <button
            onClick={find}
            className="w-full md:w-auto bg-white px-8 py-4 rounded-xl text-sm font-bold text-black shadow-lg shadow-black/20 hover:bg-zinc-200 active:scale-95 transition-all shrink-0 h-[58px] flex items-center justify-center"
          >
            Search
          </button>
        </div>

        {localError && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="text-left leading-relaxed">{localError}</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {info && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="glass-card p-8 rounded-2xl col-span-1 md:col-span-2 flex flex-col items-center text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white">
                <Clock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-4xl font-display font-bold text-white tracking-tight">
                  {info.dayName}
                </h3>
                <p className="text-zinc-500 text-sm font-medium">
                  {info.fullDate}
                </p>
              </div>
            </div>

            <ResultCard
              label="Weekly Status"
              value={info.isWeekend ? "Weekend" : "Weekday"}
            />
            <ResultCard label="Week Number" value={`Week ${info.weekNumber}`} />
            <ResultCard
              label="Year Type"
              value={info.isLeapYear ? "Leap Year" : "Common Year"}
            />
            <ResultCard
              label="System"
              value="Gregorian"
              subtext="Standardized"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 px-8 py-3.5 rounded-lg text-sm font-bold tracking-tight transition-all duration-300",
        active ? "text-black" : "text-zinc-500 hover:text-zinc-300",
      )}
    >
      {active && (
        <motion.div
          layoutId="tab"
          className="absolute inset-0 bg-white rounded-lg"
          transition={{ type: "spring", bounce: 0.1, duration: 0.5 }}
        />
      )}
      <span className="relative z-10">{icon}</span>
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function ResultCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="p-6 rounded-2xl border border-zinc-900 bg-black flex flex-col items-center justify-center text-center overflow-hidden transition-all hover:bg-zinc-950">
      <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-3">
        {label}
      </span>
      <span className="text-xl md:text-2xl font-display font-bold text-zinc-100 w-full break-words">
        {value}
      </span>
      {subtext && (
        <span className="text-xs text-zinc-600 font-medium mt-2 w-full break-words">
          {subtext}
        </span>
      )}
    </div>
  );
}
