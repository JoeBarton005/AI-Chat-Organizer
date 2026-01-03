import React, { useState } from 'react';
import { Project } from '../types';
import { Plus, Clock, ArrowRight, Zap, Sparkles, Folder } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  onCreateProject: (name: string) => void;
  onSelectProject: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, onCreateProject, onSelectProject }) => {
  const [projectName, setProjectName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      onCreateProject(projectName);
    }
  };

  const recentProjects = [...projects].sort((a, b) => {
    // Sort by most recent update
    const getProjectTime = (p: Project) => {
       if (p.documents.length === 0) return 0;
       return Math.max(...p.documents.map(d => d.updatedAt));
    };
    return getProjectTime(b) - getProjectTime(a);
  }).slice(0, 4);

  return (
    <div className="h-full overflow-y-auto bg-[#0f1115] p-6 md:p-12 flex flex-col items-center">
      <div className="max-w-5xl w-full flex-1 flex flex-col">
        
        {/* Header */}
        <div className="mt-12 mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-light text-white mb-6 tracking-tight">
            Organize your context with <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 font-normal">Gemini</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Transform chaotic chat logs into structured books. Summarize, organize, and retrieve knowledge effortlessly.
          </p>
        </div>

        {/* Quick Create Input */}
        <div className="w-full max-w-2xl mx-auto mb-16">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative bg-[#1e1f20] border border-gray-700 rounded-xl p-2 flex items-center shadow-2xl">
              <div className="pl-4 pr-3 text-gray-500">
                <Sparkles size={20} />
              </div>
              <input 
                type="text" 
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Name your new project..."
                className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-base py-2"
                autoFocus
              />
              <button 
                type="submit"
                disabled={!projectName.trim()}
                className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <span>Create</span>
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="text-center mt-3 text-xs text-gray-600">
              Press Enter to create a new collection
            </div>
          </form>
        </div>

        {/* Recent Projects Grid */}
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-6">
            <Clock size={18} className="text-gray-500" />
            <h2 className="text-lg font-medium text-gray-300">Recent Projects</h2>
          </div>

          {projects.length === 0 ? (
            <div className="border border-dashed border-gray-800 rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder size={24} className="text-gray-600" />
              </div>
              <p className="text-gray-500">No projects yet. Create one above to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentProjects.map(project => (
                <div 
                  key={project.id}
                  onClick={() => onSelectProject(project.id)}
                  className="bg-[#1e1f20] border border-gray-800 hover:border-gray-600 rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg group flex flex-col h-40"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <Folder size={20} />
                    </div>
                  </div>
                  <h3 className="text-white font-medium truncate mb-1">{project.name}</h3>
                  <p className="text-xs text-gray-500 mt-auto">
                    {project.documents.length} document{project.documents.length !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 pt-8 border-t border-gray-800">
          <div className="p-4 rounded-xl bg-[#131518]">
            <div className="flex items-center space-x-3 mb-2 text-blue-400">
              <Zap size={18} />
              <h3 className="font-medium text-gray-200">AI Summarization</h3>
            </div>
            <p className="text-sm text-gray-500">Automatically breaks down long chats into logical chapters with concise summaries.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#131518]">
            <div className="flex items-center space-x-3 mb-2 text-purple-400">
              <Folder size={18} />
              <h3 className="font-medium text-gray-200">Project Organization</h3>
            </div>
            <p className="text-sm text-gray-500">Group multiple context logs into projects for easy switching and management.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#131518]">
            <div className="flex items-center space-x-3 mb-2 text-green-400">
              <Sparkles size={18} />
              <h3 className="font-medium text-gray-200">Context Preservation</h3>
            </div>
            <p className="text-sm text-gray-500">Choose to keep full original text or just summaries to optimize token usage.</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;