import React, { useState, useRef, useEffect } from 'react';
import { Document, Segment, ChatMessage } from '../types';
import { analyzeText, generateTitle, chatWithDocumentStream } from '../services/geminiService';
import { createId, loadSettings } from '../services/storageService';
import { getCurrentUser } from '../services/authService';
import { FileText, Copy, Check, ChevronRight, Book, Layers, Type, Loader2, ToggleLeft, ToggleRight, Sparkles, MessageSquare, Send, X, ClipboardList, List, Square, CheckSquare, Settings2, Trash } from 'lucide-react';

interface DocumentViewProps {
  document: Document | null;
  projectId: string;
  onUpdateDocument: (projectId: string, doc: Document) => void;
  onCreateDocument: (projectId: string, doc: Document) => void;
}

// --- SUB-COMPONENT: Smooth Content (Typewriter Effect) ---
const SmoothContent = ({ text, isThinking }: { text: string; isThinking: boolean }) => {
    const [displayedText, setDisplayedText] = useState("");
    
    useEffect(() => {
        if (!text) {
            setDisplayedText("");
            return;
        }
        if (displayedText === text) return;
        if (displayedText.length > text.length && !text.startsWith(displayedText)) {
            setDisplayedText(text);
            return;
        }

        const diff = text.length - displayedText.length;
        let speed = 15;
        if (diff > 50) speed = 5;
        else if (diff > 20) speed = 10;
        
        const timer = setTimeout(() => {
            setDisplayedText(text.slice(0, displayedText.length + 1));
        }, speed);

        return () => clearTimeout(timer);
    }, [text, displayedText]);

    return (
        <span>
            {displayedText}
            {isThinking && (
                <span className="inline-block w-1.5 h-4 ml-1 align-middle bg-blue-400 animate-pulse rounded-sm" />
            )}
        </span>
    );
};

// --- SUB-COMPONENT: Thinking Indicator ---
const ThinkingIndicator = () => (
    <div className="flex items-center space-x-1 h-6 px-1">
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
    </div>
);

const DocumentView: React.FC<DocumentViewProps> = ({ 
  document, 
  projectId, 
  onUpdateDocument,
  onCreateDocument 
}) => {
  // Input State
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [keepOriginal, setKeepOriginal] = useState(true);
  
  // Selection State
  const [selectedOriginalIds, setSelectedOriginalIds] = useState<Set<string>>(new Set());
  const [selectedSummaryIds, setSelectedSummaryIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [thinkingMessageId, setThinkingMessageId] = useState<string | null>(null);

  // Temporary chat history for when no document is created yet
  const [tempChatHistory, setTempChatHistory] = useState<ChatMessage[]>([]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    setSelectedOriginalIds(new Set());
    setSelectedSummaryIds(new Set());
  }, [document?.id]);

  const activeChatHistory = document ? (document.chatHistory || []) : tempChatHistory;

  useEffect(() => {
    if (isChatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChatHistory.length, isChatOpen, isChatSending, thinkingMessageId]);

  const getSettings = () => {
    const user = getCurrentUser();
    return loadSettings(user?.id);
  };

  // --- ANALYSIS LOGIC ---
  const handleProcess = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    try {
      const settings = getSettings();
      const segmentsData = await analyzeText(inputText, { settings, keepOriginal });
      const docTitle = await generateTitle(inputText, settings);

      const newSegments: Segment[] = segmentsData.map(s => ({
        id: createId(),
        ...s
      }));

      const newDoc: Document = {
        id: createId(),
        title: docTitle,
        segments: newSegments,
        chatHistory: tempChatHistory,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      onCreateDocument(projectId, newDoc);
      setInputText("");
      setTempChatHistory([]);
    } catch (error) {
      console.error("Failed to process text", error);
      alert("Analysis failed. Please check your settings (API Key/Network) or try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  // --- CHAT LOGIC ---
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!chatInput.trim() || isChatSending) return;

    const userMsg: ChatMessage = {
      id: createId(),
      role: 'user',
      text: chatInput,
      timestamp: Date.now()
    };

    const updatedHistory = [...activeChatHistory, userMsg];
    
    const aiMsgId = createId();
    const initialAiMsg: ChatMessage = {
        id: aiMsgId,
        role: 'model',
        text: "",
        timestamp: Date.now()
    };
    
    let runningHistory = [...updatedHistory, initialAiMsg];
    
    if (document) {
      onUpdateDocument(projectId, { ...document, chatHistory: runningHistory });
    } else {
      setTempChatHistory(runningHistory);
    }
    
    setChatInput("");
    setIsChatSending(true);
    setThinkingMessageId(aiMsgId);

    try {
      const settings = getSettings();
      let aiTextAccumulator = "";
      
      const stream = chatWithDocumentStream(document, userMsg.text, activeChatHistory, settings);

      for await (const chunk of stream) {
          if (thinkingMessageId === aiMsgId) {
              setThinkingMessageId(null); 
          }
          aiTextAccumulator += chunk;
          runningHistory = runningHistory.map(m => 
              m.id === aiMsgId ? { ...m, text: aiTextAccumulator } : m
          );
          if (document) {
             onUpdateDocument(projectId, { ...document, chatHistory: runningHistory });
          } else {
             setTempChatHistory([...runningHistory]);
          }
      }
    } catch (error) {
      console.error("Chat error", error);
      runningHistory = runningHistory.map(m => 
          m.id === aiMsgId ? { ...m, text: "抱歉，出错了。请检查网络或 Key 设置。" } : m
      );
      if (document) onUpdateDocument(projectId, { ...document, chatHistory: runningHistory });
      else setTempChatHistory([...runningHistory]);
    } finally {
      setIsChatSending(false);
      setThinkingMessageId(null);
    }
  };

  // --- SELECTION LOGIC ---
  const toggleSelectOriginal = (id: string) => {
    const newSet = new Set(selectedOriginalIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedOriginalIds(newSet);
  };

  const toggleSelectSummary = (id: string) => {
    const newSet = new Set(selectedSummaryIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSummaryIds(newSet);
  };

  const toggleSelectAllOriginals = () => {
    if (!document) return;
    if (selectedOriginalIds.size === document.segments.length) {
      setSelectedOriginalIds(new Set());
    } else {
      setSelectedOriginalIds(new Set(document.segments.map(s => s.id)));
    }
  };

  const toggleSelectAllSummaries = () => {
    if (!document) return;
    if (selectedSummaryIds.size === document.segments.length) {
      setSelectedSummaryIds(new Set());
    } else {
      setSelectedSummaryIds(new Set(document.segments.map(s => s.id)));
    }
  };

  const copySelectedOriginals = () => {
    if (!document) return;
    const text = document.segments
      .filter(s => selectedOriginalIds.has(s.id))
      .map(s => s.content)
      .join("\n\n---\n\n");
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedId('bulk-orig');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const copySelectedSummaries = () => {
    if (!document) return;
    const text = document.segments
      .filter(s => selectedSummaryIds.has(s.id))
      .map(s => `Title: ${s.title}\nSummary: ${s.summary}`)
      .join("\n\n---\n\n");
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedId('bulk-sum');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const scrollToSection = (id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const copyTOC = () => {
    if (!document) return;
    const toc = document.segments.map((s, i) => `${i + 1}. ${s.title}`).join('\n');
    navigator.clipboard.writeText(toc);
    setCopiedId('toc');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Render Checkbox
  const Checkbox = ({ checked, onChange, label, alignRight }: { checked: boolean, onChange: () => void, label?: string, alignRight?: boolean }) => (
    <button 
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`flex items-center space-x-2 text-sm transition-colors group ${alignRight ? 'flex-row-reverse space-x-reverse' : ''} ${checked ? 'text-primary' : 'text-gray-600 hover:text-gray-400'}`}
    >
      <div className={`transition-transform duration-200 ${checked ? 'scale-110' : 'scale-100 group-hover:scale-110'}`}>
          {checked ? <CheckSquare size={20} /> : <Square size={20} />}
      </div>
      {label && <span className="font-medium">{label}</span>}
    </button>
  );

  return (
    <div className="flex h-full bg-[#0f1115] text-gray-200 overflow-hidden">
      
      {/* 1. Sidebar / Directory */}
      {document && (
        <div className="w-64 bg-[#131518] border-r border-gray-800 flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-gray-800 bg-[#131518] sticky top-0 z-10 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">目录</h3>
              <h2 className="text-sm font-semibold text-white truncate max-w-[140px]" title={document.title}>{document.title}</h2>
            </div>
            <button 
               onClick={copyTOC}
               className="text-gray-500 hover:text-white p-1.5 rounded hover:bg-gray-800 transition-colors"
               title="复制目录"
            >
               {copiedId === 'toc' ? <Check size={14} /> : <ClipboardList size={14} />}
            </button>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {document.segments.map((segment, idx) => (
              <button
                key={segment.id}
                onClick={() => scrollToSection(segment.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[#1e1f20] hover:text-primary transition-colors group flex items-start space-x-3"
              >
                <span className="text-xs font-mono text-gray-600 mt-1 min-w-[1.5rem]">{(idx + 1).toString().padStart(2, '0')}</span>
                <span className="text-sm text-gray-400 group-hover:text-gray-100 font-medium leading-tight line-clamp-2">
                  {segment.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Main Area */}
      <div className="flex-1 overflow-y-auto bg-[#0f1115] relative scroll-smooth">
        
        {!document ? (
          // --- EMPTY STATE ---
          <div className="max-w-4xl mx-auto h-full flex flex-col justify-center p-6">
            <div className="mb-6 space-y-2">
              <h2 className="text-3xl font-light text-white">输入文本内容</h2>
              <p className="text-gray-400">在此粘贴您的长聊天记录或文章。AI 将自动将其整理成书籍格式，并提取摘要。</p>
            </div>

            <div className="bg-[#1e1f20] rounded-xl border border-gray-800 p-1 flex-1 min-h-[400px] flex flex-col relative shadow-2xl">
              <textarea
                className="w-full h-full bg-transparent text-gray-200 p-6 resize-none focus:outline-none font-mono text-sm leading-relaxed"
                placeholder="请在此粘贴..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <div className="absolute bottom-4 right-4 flex items-center space-x-4 bg-[#2a2b2d] p-2 rounded-lg border border-gray-700 shadow-lg">
                <button 
                  onClick={() => setKeepOriginal(!keepOriginal)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-md hover:bg-gray-700 transition-colors text-sm text-gray-300"
                >
                  {keepOriginal ? <ToggleRight className="text-primary" /> : <ToggleLeft className="text-gray-500" />}
                  <span>{keepOriginal ? "保留原文" : "仅摘要"}</span>
                </button>
                <button
                  disabled={isProcessing || !inputText.trim()}
                  onClick={handleProcess}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium text-white transition-all
                    ${isProcessing || !inputText.trim() 
                      ? 'bg-gray-700 cursor-not-allowed text-gray-500' 
                      : 'bg-primary hover:bg-blue-600 shadow-[0_0_15px_rgba(76,139,245,0.4)]'
                    }`}
                >
                  {isProcessing ? (<><Loader2 className="animate-spin" size={18} /><span>分析中...</span></>) : (<><Sparkles size={18} /><span>生成书籍</span></>)}
                </button>
              </div>
            </div>
          </div>
        ) : (
          // --- BOOK VIEW (Single Column) ---
          <div className="w-full">
            
            {/* Document Title Header */}
            <div className="text-center py-12 border-b border-gray-800 bg-[#0f1115]">
              <h1 className="text-4xl font-light text-white mb-3 tracking-tight">{document.title}</h1>
              <div className="flex justify-center gap-4 text-sm text-gray-500 font-mono">
                 <span>{new Date(document.createdAt).toLocaleDateString()}</span>
                 <span>•</span>
                 <span>{document.segments.length} Chapters</span>
              </div>
            </div>

            {/* Sticky Bulk Actions Header */}
            <div className="sticky top-0 z-20 bg-[#0f1115]/95 backdrop-blur-md border-b border-gray-800 shadow-lg">
                <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
                    {/* LEFT: Original Actions */}
                    <div className="flex items-center space-x-4 w-1/3">
                        <Checkbox 
                            checked={selectedOriginalIds.size > 0 && selectedOriginalIds.size === document.segments.length}
                            onChange={toggleSelectAllOriginals}
                            label="原文全选"
                        />
                        {selectedOriginalIds.size > 0 && (
                            <button onClick={copySelectedOriginals} className="flex items-center gap-1.5 px-3 py-1 bg-blue-900/30 text-blue-300 rounded hover:bg-blue-900/50 transition-colors text-xs font-medium">
                                {copiedId === 'bulk-orig' ? <Check size={14} /> : <Copy size={14} />} 复制
                            </button>
                        )}
                    </div>

                    {/* CENTER: Label */}
                    <div className="flex-1 text-center hidden md:block opacity-30">
                        <Book size={16} className="inline mx-auto" />
                    </div>

                    {/* RIGHT: Summary Actions */}
                    <div className="flex items-center justify-end space-x-4 w-1/3">
                        {selectedSummaryIds.size > 0 && (
                            <button onClick={copySelectedSummaries} className="flex items-center gap-1.5 px-3 py-1 bg-purple-900/30 text-purple-300 rounded hover:bg-purple-900/50 transition-colors text-xs font-medium">
                                {copiedId === 'bulk-sum' ? <Check size={14} /> : <Copy size={14} />} 复制
                            </button>
                        )}
                        <Checkbox 
                            checked={selectedSummaryIds.size > 0 && selectedSummaryIds.size === document.segments.length}
                            onChange={toggleSelectAllSummaries}
                            label="摘要全选"
                            alignRight
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-12 space-y-16 pb-32">
                {document.segments.map((segment, idx) => (
                <div 
                    key={segment.id} 
                    id={segment.id}
                    ref={el => {
                    if (el) sectionRefs.current[segment.id] = el;
                    else delete sectionRefs.current[segment.id];
                    }}
                    className="relative group"
                >
                    {/* Chapter Watermark */}
                    <div className="absolute -left-4 top-0 text-[100px] font-bold text-gray-800/20 leading-none select-none -z-10 font-serif">
                        {idx + 1}
                    </div>

                    <div className="space-y-6">
                        
                        {/* 1. Title & Summary Box (Checkbox on Right) */}
                        <div className="flex items-start gap-6">
                            {/* Spacer Left */}
                            <div className="w-12 flex-shrink-0 hidden md:block"></div>

                            {/* Content Card */}
                            <div className={`flex-1 relative bg-[#1a1c20] rounded-2xl border-l-4 p-8 shadow-sm transition-all duration-300 ${selectedSummaryIds.has(segment.id) ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.15)] bg-[#1e2024]' : 'border-gray-700 hover:border-gray-600'}`}>
                                <h2 className="text-2xl font-serif text-gray-100 mb-4 leading-snug">{segment.title}</h2>
                                <p className="text-gray-300 leading-relaxed text-lg font-light tracking-wide">{segment.summary}</p>
                            </div>

                            {/* Checkbox Right */}
                            <div className="w-12 pt-8 flex-shrink-0 flex justify-center">
                                <Checkbox 
                                    checked={selectedSummaryIds.has(segment.id)}
                                    onChange={() => toggleSelectSummary(segment.id)}
                                />
                            </div>
                        </div>

                        {/* 2. Original Text Box (Checkbox on Left) */}
                        <div className="flex items-start gap-6">
                            {/* Checkbox Left */}
                            <div className="w-12 pt-8 flex-shrink-0 flex justify-center">
                                <Checkbox 
                                    checked={selectedOriginalIds.has(segment.id)}
                                    onChange={() => toggleSelectOriginal(segment.id)}
                                />
                            </div>

                            {/* Content Card */}
                            <div className={`flex-1 relative bg-[#151619] rounded-2xl border border-dashed p-8 transition-all duration-300 ${selectedOriginalIds.has(segment.id) ? 'border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.1)]' : 'border-gray-800 hover:border-gray-700'}`}>
                                <div className="flex items-center space-x-2 mb-4 opacity-40 border-b border-gray-800 pb-2">
                                    <FileText size={14} />
                                    <span className="text-xs uppercase tracking-widest font-bold">Original Text</span>
                                </div>
                                {segment.content ? (
                                    <div className="prose prose-invert prose-sm max-w-none text-gray-400 font-mono text-[14px] leading-relaxed whitespace-pre-wrap opacity-90">
                                        {segment.content}
                                    </div>
                                ) : (
                                    <div className="text-gray-600 text-sm italic py-4 text-center">No original content available</div>
                                )}
                            </div>

                            {/* Spacer Right */}
                            <div className="w-12 flex-shrink-0 hidden md:block"></div>
                        </div>

                    </div>
                </div>
                ))}
                
                <div className="h-24 flex items-center justify-center text-gray-700 font-serif italic text-lg opacity-50">
                    The End
                </div>
            </div>
          </div>
        )}
        
        <button onClick={() => setIsChatOpen(!isChatOpen)} className={`fixed bottom-6 right-6 z-50 p-3 rounded-full bg-primary text-white shadow-lg hover:bg-blue-600 transition-all ${isChatOpen ? 'hidden' : 'md:hidden flex'}`}>
          <MessageSquare size={20} />
        </button>
      </div>

      {/* 3. AI Chat Sidebar */}
      <div className={`${isChatOpen ? 'w-80 border-l' : 'w-0'} bg-[#131518] border-gray-800 flex flex-col transition-all duration-300 ease-in-out relative flex-shrink-0 z-30`}>
         <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-[#131518]">
            <div className="flex items-center space-x-2">
               <Sparkles size={14} className="text-primary"/>
               <span className="font-semibold text-sm text-gray-200">AI 助手</span>
            </div>
            <div className="flex items-center">
                {!document && activeChatHistory.length > 0 && (
                    <button onClick={() => setTempChatHistory([])} className="text-gray-500 hover:text-red-400 mr-2 p-1" title="清空对话">
                        <Trash size={14} />
                    </button>
                )}
                <button onClick={() => setIsChatOpen(false)} className="text-gray-500 hover:text-white md:hidden"><X size={16} /></button>
                <button onClick={() => setIsChatOpen(!isChatOpen)} className="text-gray-500 hover:text-white hidden md:block"><ChevronRight size={16} /></button>
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeChatHistory.length === 0 && (
               <div className="text-center mt-10 text-gray-600 text-sm px-4">
                  <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Sparkles size={20} className="text-primary opacity-50" />
                  </div>
                  <p className="mb-2 font-medium text-gray-400">Context AI Ready</p>
                  <p className="text-xs">
                     {document ? "我可以回答关于本文档的任何问题。" : "您可以直接询问..."}
                  </p>
               </div>
            )}
            
            {activeChatHistory.map((msg) => (
               <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user' ? 'bg-blue-600/20 text-blue-100 border border-blue-500/30' : 'bg-gray-800 text-gray-300'}`}>
                     {msg.role === 'user' ? (
                        msg.text
                     ) : (
                        (!msg.text && thinkingMessageId === msg.id) 
                            ? <ThinkingIndicator /> 
                            : <SmoothContent text={msg.text} isThinking={thinkingMessageId === msg.id} />
                     )}
                  </div>
               </div>
            ))}
            <div ref={chatEndRef} />
         </div>

         <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-800 bg-[#131518]">
            <div className="relative">
               <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={document ? "询问文档内容..." : "您可以直接询问..."}
                  className="w-full bg-[#1e1f20] text-gray-200 text-sm rounded-lg pl-3 pr-10 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
               />
               <button 
                  type="submit"
                  disabled={!chatInput.trim() || isChatSending}
                  className="absolute right-2 top-2 text-gray-400 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {isChatSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
               </button>
            </div>
         </form>
      </div>
    </div>
  );
};

export default DocumentView;