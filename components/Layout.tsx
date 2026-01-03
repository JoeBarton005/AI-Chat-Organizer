import React, { useState, useEffect } from 'react';
import { Project, Document, AppSettings, AIProvider, User } from '../types';
import { loadSettings, saveSettings } from '../services/storageService';
import { logoutUser } from '../services/authService';
import { Folder, FileText, Plus, Menu, ArrowLeft, Trash2, Settings, FilePlus, X, Database, Info, Cpu, PenTool, Save, RotateCcw, Thermometer, Globe, Key, Box, Zap, LogOut, User as UserIcon } from 'lucide-react';

interface LayoutProps {
  user: User;
  projects: Project[];
  currentProjectId: string | null;
  currentDocumentId: string | null;
  onSelectProject: (id: string) => void;
  onSelectDocument: (projectId: string, docId: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (id: string) => void;
  onDeleteDocument: (projectId: string, docId: string) => void;
  onGoHome: () => void;
  onCreateNewDocument?: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const GOOGLE_MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash (Recommended)' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro' },
  { id: 'gemini-flash-latest', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-flash-lite-latest', name: 'Gemini 2.5 Flash Lite' },
];

interface Preset {
  id: string;
  name: string;
  baseUrl: string;
  group: 'china' | 'global';
  desc: string;
}

const OPENAI_PRESETS: Preset[] = [
  // 国内模型 (China)
  { 
    id: 'deepseek-chat', 
    name: 'DeepSeek V3', 
    baseUrl: 'https://api.deepseek.com',
    group: 'china',
    desc: '性价比之王'
  },
  { 
    id: 'glm-4-flash', 
    name: '智谱 GLM-4 Flash', 
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    group: 'china',
    desc: '免费/极速'
  },
  { 
    id: 'qwen-turbo', 
    name: '通义千问 Turbo', 
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    group: 'china',
    desc: '阿里云官方'
  },
  { 
    id: 'moonshot-v1-8k', 
    name: 'Kimi (Moonshot)', 
    baseUrl: 'https://api.moonshot.cn/v1',
    group: 'china',
    desc: '长文本友好'
  },
  // 国际/加速 (Global)
  { 
    id: 'llama-3.3-70b-versatile', 
    name: 'Groq (Llama 3.3)', 
    baseUrl: 'https://api.groq.com/openai/v1',
    group: 'global',
    desc: '全球最快推理'
  },
  { 
    id: 'gpt-4o-mini', 
    name: 'GPT-4o Mini', 
    baseUrl: 'https://api.openai.com/v1',
    group: 'global',
    desc: 'OpenAI 官方'
  },
];

const Layout: React.FC<LayoutProps> = ({
  user,
  projects,
  currentProjectId,
  currentDocumentId,
  onSelectProject,
  onSelectDocument,
  onCreateProject,
  onDeleteProject,
  onDeleteDocument,
  onGoHome,
  onCreateNewDocument,
  onLogout,
  children
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings State
  const [settings, setSettings] = useState<AppSettings>(loadSettings(user.id));
  const [tempSettings, setTempSettings] = useState<AppSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);
  
  // For validation
  const [showKeyWarning, setShowKeyWarning] = useState(false);

  useEffect(() => {
    setSettings(loadSettings(user.id));
  }, [isSettingsOpen, user.id]);

  // Check changes
  useEffect(() => {
    setHasChanges(JSON.stringify(tempSettings) !== JSON.stringify(settings));
  }, [tempSettings, settings]);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onCreateProject(newProjectName);
      setNewProjectName("");
      setIsCreating(false);
    }
  };

  const handleSettingChange = (key: keyof AppSettings, value: any) => {
    setTempSettings(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: Preset) => {
      setTempSettings(prev => ({
          ...prev,
          openaiModelId: preset.id,
          openaiBaseUrl: preset.baseUrl
      }));
  };

  const saveConfig = () => {
    if (tempSettings.provider === 'openai' && !tempSettings.openaiApiKey) {
        setShowKeyWarning(true);
        return;
    }
    setShowKeyWarning(false);
    saveSettings(user.id, tempSettings);
    setSettings(tempSettings);
    setHasChanges(false);
    setIsSettingsOpen(false);
  };

  return (
    <div className="flex h-screen w-full bg-background text-gray-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <div 
        className={`${isSidebarOpen ? 'w-64' : 'w-0'} flex-shrink-0 bg-surface border-r border-gray-800 transition-all duration-300 ease-in-out flex flex-col relative`}
      >
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <button onClick={onGoHome} className="flex items-center space-x-2 font-semibold text-gray-100 hover:text-primary transition-colors">
            <div className="w-6 h-6 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-md"></div>
            <span>Context Book</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">我的项目</span>
              <button 
                onClick={() => setIsCreating(true)}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800"
                title="Create Project"
              >
                <Plus size={14} />
              </button>
            </div>

            {isCreating && (
              <form onSubmit={handleCreateSubmit} className="px-2 mb-2">
                <input
                  autoFocus
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onBlur={() => !newProjectName && setIsCreating(false)}
                  placeholder="项目名称..."
                  className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-primary"
                />
              </form>
            )}

            {projects.length === 0 && !isCreating && (
              <div className="text-center py-4 text-gray-600 text-sm italic">
                暂无项目
              </div>
            )}

            {projects.map(project => (
              <div key={project.id} className="mb-2">
                <div 
                  className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer ${currentProjectId === project.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
                  onClick={() => onSelectProject(project.id)}
                >
                  <div className="flex items-center space-x-2 truncate flex-1">
                    <Folder size={16} className={currentProjectId === project.id ? 'text-primary' : 'text-gray-500'} />
                    <span className="text-sm font-medium truncate">{project.name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100">
                    {currentProjectId === project.id && onCreateNewDocument && (
                       <button
                         onClick={(e) => { e.stopPropagation(); onCreateNewDocument(); }}
                         className="text-gray-500 hover:text-white p-1"
                         title="New Document"
                       >
                         <FilePlus size={12} />
                       </button>
                    )}
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                      className="text-gray-500 hover:text-red-400 p-1"
                      title="Delete Project"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                {currentProjectId === project.id && (
                  <div className="ml-4 pl-2 border-l border-gray-800 mt-1 space-y-0.5">
                    {project.documents.length === 0 && (
                      <div className="text-xs text-gray-600 py-1 pl-2">无文档</div>
                    )}
                    {project.documents.map(doc => (
                      <div
                        key={doc.id}
                        onClick={() => onSelectDocument(project.id, doc.id)}
                        className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm ${currentDocumentId === doc.id ? 'bg-blue-900/20 text-blue-300' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'}`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          <FileText size={14} />
                          <span className="truncate">{doc.title}</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteDocument(project.id, doc.id); }}
                          className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* User & Settings Footer */}
        <div className="p-3 border-t border-gray-800 bg-[#16171a]">
           <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center space-x-2 overflow-hidden">
                 <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-[10px] font-bold">
                    {user.username.substring(0,2).toUpperCase()}
                 </div>
                 <span className="text-xs text-gray-300 truncate font-medium">{user.username}</span>
              </div>
              <button 
                onClick={onLogout}
                className="text-gray-500 hover:text-red-400 transition-colors p-1"
                title="退出登录"
              >
                <LogOut size={14} />
              </button>
           </div>
           
           <button 
             onClick={() => {
                 setTempSettings(loadSettings(user.id));
                 setIsSettingsOpen(true);
             }}
             className="w-full flex items-center justify-between px-2 py-1.5 rounded hover:bg-gray-800 text-xs text-gray-500 transition-colors border border-gray-800 hover:border-gray-700"
           >
             <span className="truncate max-w-[120px]">
                 {settings.provider === 'google' 
                   ? GOOGLE_MODELS.find(m => m.id === settings.googleModelId)?.name.split('(')[0] 
                   : settings.openaiModelId}
             </span>
             <Settings size={12} />
           </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute top-4 left-4 z-50 p-2 rounded-md bg-surface border border-gray-700 hover:bg-gray-800 transition-opacity ${isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <Menu size={18} />
        </button>
        {children}
      </div>

      {/* Settings Modal (Keep logic same, just passing user.id to save) */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-[#1e1f20] border border-gray-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#252628]">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Settings size={16} />
                系统设置
              </h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Provider Selection */}
              <section>
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Globe size={14} />
                    AI 提供商
                 </h3>
                 <div className="grid grid-cols-2 gap-4">
                    <button 
                        onClick={() => handleSettingChange('provider', 'google')}
                        className={`p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${tempSettings.provider === 'google' ? 'bg-blue-900/20 border-primary text-primary' : 'bg-[#131518] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                    >
                        <span className="font-semibold">Google Gemini</span>
                        <span className="text-xs opacity-70">内置 Key (免费/极速)</span>
                    </button>
                    <button 
                        onClick={() => handleSettingChange('provider', 'openai')}
                        className={`p-4 rounded-lg border flex flex-col items-center gap-2 transition-all ${tempSettings.provider === 'openai' ? 'bg-purple-900/20 border-purple-500 text-purple-400' : 'bg-[#131518] border-gray-800 text-gray-400 hover:border-gray-600'}`}
                    >
                        <span className="font-semibold">自定义 / OpenAI 兼容</span>
                        <span className="text-xs opacity-70">DeepSeek, GLM, Qwen...</span>
                    </button>
                 </div>
              </section>

              {/* Model Config based on Provider */}
              <section className="bg-[#131518] rounded-lg p-4 border border-gray-800 space-y-4">
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                   <Cpu size={14} />
                   模型参数
                 </h3>

                 {tempSettings.provider === 'google' ? (
                     <div>
                        <label className="block text-sm text-gray-300 mb-2">Google 模型选择</label>
                        <select 
                            value={tempSettings.googleModelId}
                            onChange={(e) => handleSettingChange('googleModelId', e.target.value)}
                            className="w-full bg-[#1e1f20] border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            {GOOGLE_MODELS.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                     </div>
                 ) : (
                     <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                        {/* Presets */}
                        <div>
                            <label className="block text-sm text-gray-300 mb-3">⚡️ 快速预设 (自动填充 URL 和模型)</label>
                            
                            <div className="space-y-3">
                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">国内高速模型</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {OPENAI_PRESETS.filter(p => p.group === 'china').map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => applyPreset(p)}
                                            className={`text-left px-3 py-2 rounded border transition-all text-xs flex flex-col gap-1
                                                ${tempSettings.openaiModelId === p.id 
                                                    ? 'bg-purple-900/30 border-purple-500/50 text-purple-200' 
                                                    : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'}`}
                                        >
                                            <span className="font-semibold">{p.name}</span>
                                            <span className="opacity-60 scale-90 origin-left">{p.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-3 mt-3">
                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">国际 / 加速</div>
                                <div className="grid grid-cols-2 gap-2">
                                    {OPENAI_PRESETS.filter(p => p.group === 'global').map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => applyPreset(p)}
                                            className={`text-left px-3 py-2 rounded border transition-all text-xs flex flex-col gap-1
                                                ${tempSettings.openaiModelId === p.id 
                                                    ? 'bg-purple-900/30 border-purple-500/50 text-purple-200' 
                                                    : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'}`}
                                        >
                                            <span className="font-semibold">{p.name}</span>
                                            <span className="opacity-60 scale-90 origin-left">{p.desc}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Manual Input */}
                        <div className="grid grid-cols-1 gap-4 pt-4 border-t border-gray-800">
                            <div>
                                <label className="block text-sm text-gray-300 mb-2 flex items-center gap-1">
                                    <Globe size={12} /> Base URL (接口地址)
                                </label>
                                <input 
                                    type="text"
                                    value={tempSettings.openaiBaseUrl}
                                    onChange={(e) => handleSettingChange('openaiBaseUrl', e.target.value)}
                                    placeholder="https://api.openai.com/v1"
                                    className="w-full bg-[#1e1f20] border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-2 flex items-center gap-1">
                                    <Box size={12} /> Model ID (模型名称)
                                </label>
                                <input 
                                    type="text"
                                    value={tempSettings.openaiModelId}
                                    onChange={(e) => handleSettingChange('openaiModelId', e.target.value)}
                                    placeholder="例如: gpt-4o, deepseek-chat"
                                    className="w-full bg-[#1e1f20] border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-300 mb-2 flex items-center gap-1">
                                <Key size={12} /> API Key <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="password"
                                value={tempSettings.openaiApiKey}
                                onChange={(e) => handleSettingChange('openaiApiKey', e.target.value)}
                                placeholder="sk-..."
                                className={`w-full bg-[#1e1f20] border rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 font-mono ${showKeyWarning && !tempSettings.openaiApiKey ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-700'}`}
                            />
                            {showKeyWarning && !tempSettings.openaiApiKey && (
                                <p className="text-xs text-red-400 mt-1">请填写 API Key</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                                您的 Key 仅存储在本地浏览器中，将直接发送至上方配置的 Base URL。
                            </p>
                        </div>
                     </div>
                 )}
                 
                 <div className="pt-2 border-t border-gray-700/50 mt-2">
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm text-gray-300 flex items-center gap-2">
                            <Thermometer size={14} />
                            随机性 (Temperature)
                        </label>
                        <span className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {tempSettings.temperature?.toFixed(1) || 0.7}
                        </span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="2" 
                        step="0.1"
                        value={tempSettings.temperature || 0.7}
                        onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                 </div>
              </section>

              {/* Prompt Config */}
              <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <PenTool size={14} />
                        系统提示词 (Prompt)
                    </h3>
                    <button 
                       onClick={() => handleSettingChange('customPrompt', loadSettings(user.id).customPrompt || '')}
                       className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                        <RotateCcw size={12} /> 恢复默认
                    </button>
                </div>
                <div className="bg-[#131518] rounded-lg p-4 border border-gray-800">
                   <textarea
                      value={tempSettings.customPrompt}
                      onChange={(e) => handleSettingChange('customPrompt', e.target.value)}
                      className="w-full h-48 bg-[#1e1f20] border border-gray-700 rounded-md px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-none"
                   />
                </div>
              </section>

              {/* Data Section */}
              <section>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Database size={14} />
                  数据管理
                </h3>
                <div className="bg-[#2a1515] rounded-lg p-4 border border-red-900/30">
                    <button 
                    onClick={() => {
                        if (window.confirm("确定要删除当前用户的本地数据吗？此操作无法撤销。")) {
                            localStorage.removeItem(`context_book_data_${user.id}`);
                            localStorage.removeItem(`context_book_settings_${user.id}`);
                            window.location.reload();
                        }
                    }}
                    className="py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-md text-xs font-medium transition-colors flex items-center gap-2"
                    >
                    <Trash2 size={14} />
                    删除当前账户数据
                    </button>
                </div>
              </section>
            </div>

            <div className="p-4 bg-[#131518] border-t border-gray-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="px-4 py-2 hover:bg-gray-800 text-gray-300 text-sm rounded-lg transition-colors"
              >
                取消
              </button>
              <button 
                onClick={saveConfig}
                className={`px-4 py-2 flex items-center gap-2 text-sm rounded-lg transition-colors font-medium ${hasChanges ? 'bg-primary hover:bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}
              >
                <Save size={16} />
                保存设置
              </button>
            </div>
          </div>
          <div className="absolute inset-0 -z-10" onClick={() => setIsSettingsOpen(false)}></div>
        </div>
      )}
    </div>
  );
};

export default Layout;