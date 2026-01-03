import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import DocumentView from './components/DocumentView';
import Login from './components/Login';
import { Project, Document, ViewMode, User } from './types';
import { loadProjects, saveProjects, createId } from './services/storageService';
import { getCurrentUser, logoutUser } from './services/authService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  
  // App Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

  // Check login on mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
  }, []);

  // Load user projects when user changes
  useEffect(() => {
    if (user) {
      const loaded = loadProjects(user.id);
      setProjects(loaded);
      // Reset view to dashboard
      setCurrentProjectId(null);
      setCurrentDocumentId(null);
      setViewMode('dashboard');
    } else {
      setProjects([]);
    }
  }, [user]);

  // Sync projects to storage
  useEffect(() => {
    if (user && projects.length > 0) {
      saveProjects(user.id, projects);
    } else if (user && projects.length === 0) {
      // Also sync empty state if user deleted all projects
       saveProjects(user.id, []);
    }
  }, [projects, user]);

  const handleCreateProject = (name: string) => {
    const newProject: Project = {
      id: createId(),
      name,
      documents: []
    };
    setProjects([...projects, newProject]);
    setCurrentProjectId(newProject.id);
    setCurrentDocumentId(null);
    setViewMode('document');
  };

  const handleDeleteProject = (id: string) => {
    const newProjects = projects.filter(p => p.id !== id);
    setProjects(newProjects);
    
    if (currentProjectId === id) {
      setCurrentProjectId(null);
      setCurrentDocumentId(null);
      setViewMode('dashboard');
    }
  };

  const handleCreateDocument = (projectId: string, doc: Document) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return { ...p, documents: [...p.documents, doc] };
      }
      return p;
    }));
    setCurrentDocumentId(doc.id);
    setViewMode('document');
  };

  const handleUpdateDocument = (projectId: string, updatedDoc: Document) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          documents: p.documents.map(d => d.id === updatedDoc.id ? updatedDoc : d)
        };
      }
      return p;
    }));
  };

  const handleDeleteDocument = (projectId: string, docId: string) => {
    setProjects(projects.map(p => {
      if (p.id === projectId) {
        return { ...p, documents: p.documents.filter(d => d.id !== docId) };
      }
      return p;
    }));
    if (currentDocumentId === docId) {
      setCurrentDocumentId(null);
    }
  };

  const handleSelectProject = (id: string) => {
    setCurrentProjectId(id);
    setCurrentDocumentId(null); 
    setViewMode('document');
  };

  const handleSelectDocument = (projectId: string, docId: string) => {
    setCurrentProjectId(projectId);
    setCurrentDocumentId(docId);
    setViewMode('document');
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const currentProject = projects.find(p => p.id === currentProjectId) || null;
  const currentDocument = currentProject?.documents.find(d => d.id === currentDocumentId) || null;

  return (
    <Layout
      user={user}
      projects={projects}
      currentProjectId={currentProjectId}
      currentDocumentId={currentDocumentId}
      onSelectProject={handleSelectProject}
      onSelectDocument={handleSelectDocument}
      onCreateProject={handleCreateProject}
      onDeleteProject={handleDeleteProject}
      onDeleteDocument={handleDeleteDocument}
      onGoHome={() => {
        setCurrentProjectId(null);
        setCurrentDocumentId(null);
        setViewMode('dashboard');
      }}
      onCreateNewDocument={() => {
        if (currentProjectId) {
           setCurrentDocumentId(null);
           setViewMode('document');
        }
      }}
      onLogout={handleLogout}
    >
      {viewMode === 'dashboard' ? (
        <Dashboard 
          projects={projects}
          onCreateProject={handleCreateProject}
          onSelectProject={handleSelectProject}
        />
      ) : (
        currentProject && (
          <DocumentView 
            document={currentDocument} 
            projectId={currentProject.id}
            onUpdateDocument={handleUpdateDocument}
            onCreateDocument={handleCreateDocument}
          />
        )
      )}
    </Layout>
  );
};

export default App;