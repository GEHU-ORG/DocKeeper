'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { type FileItem } from '@/lib/github';
import { Breadcrumb } from './Breadcrumb';
import { Toolbar } from './Toolbar';
import { FileList, type SortConfig, type SortColumn } from './FileList';
import { UploadArea } from './UploadArea';
import { NewFolderDialog } from './NewFolderDialog';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';
import { MoveDialog } from './MoveDialog';
import { FilePreview } from './FilePreview';
import { AIOrganizeDialog, type AIMove } from './AIOrganizeDialog';
import { JoinOrgPrompt } from './JoinOrgPrompt';
import { AddUniversityModal } from './AddUniversityModal';
import { GenerateNotesModal } from './GenerateNotesModal';


interface FileBrowserProps {
  initialPath: string;
  isReadOnly?: boolean;
  isSignedIn?: boolean;
  username?: string;
}

export function FileBrowser({ initialPath, isReadOnly = false, isSignedIn = false, username = '' }: FileBrowserProps) {
  const router = useRouter();
  const [items, setItems] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Search and Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'name', direction: 'asc' });

  // Dialog states
  const [showAddUni, setShowAddUni] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [showGenerateNotes, setShowGenerateNotes] = useState(false);
  const [newFolderTitle, setNewFolderTitle] = useState('New Folder');
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [moveTarget, setMoveTarget] = useState<FileItem | null>(null);
  const [previewTarget, setPreviewTarget] = useState<FileItem | null>(null);
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [isBulkMove, setIsBulkMove] = useState(false);
  const [isOperating, setIsOperating] = useState(false);

  // AI Organize state
  const [isAIOrganizeOpen, setIsAIOrganizeOpen] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiMoves, setAiMoves] = useState<AIMove[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);

  // Join Org Prompt
  const [showJoinPrompt, setShowJoinPrompt] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check for Virtual Folders
      const isNotesFolder = initialPath.endsWith('/✨ My Study Notes');
      const isPyqFolder = initialPath.endsWith('/✨ My PYQ Answers');

      if (isNotesFolder || isPyqFolder) {
        const subjectPath = initialPath.replace(/\/(✨ My Study Notes|✨ My PYQ Answers)$/, '');
        const type = isNotesFolder ? 'notes' : 'pyq';
        
        const url = new URL('/api/study/my-ai-content', window.location.origin);
        url.searchParams.set('subjectPath', subjectPath);
        url.searchParams.set('type', type);
        
        const res = await fetch(url.toString());
        const data = await res.json();
        
        // Map DB items to FileItem format so FileList can render them
        const virtualItems = (data.items || []).map((item: any) => ({
          id: item._id,
          name: isNotesFolder ? item.title : item.pdfName,
          type: 'file', // acts like a file to be previewed
          url: `/virtual/${type}/${item._id}`, // custom URL marker for virtual files
          path: `${initialPath}/${item._id}`,
          uploadedAt: item.createdAt,
          size: 0,
        }));
        
        setItems(virtualItems);
        setIsLoading(false);
        return;
      }

      // Normal GitHub fetch
      const url = new URL('/api/files', window.location.origin);
      url.searchParams.set('path', initialPath);
      if (debouncedSearch) {
        url.searchParams.set('search', debouncedSearch);
      }
      const res = await fetch(url.toString());
      const data = await res.json();
      
      let fetchedItems = data.items || [];

      // Inject Virtual Folders if we are at the Subject root (depth 6 -> initialPath has 6 parts)
      const parts = initialPath.split('/').filter(Boolean);
      if (parts.length === 6 && !debouncedSearch) {
        fetchedItems.unshift({
          id: 'virtual-notes',
          name: '✨ My Study Notes',
          type: 'folder',
          path: `${initialPath}/✨ My Study Notes`,
          uploadedAt: new Date().toISOString(),
        });
        fetchedItems.unshift({
          id: 'virtual-pyq',
          name: '✨ My PYQ Answers',
          type: 'folder',
          path: `${initialPath}/✨ My PYQ Answers`,
          uploadedAt: new Date().toISOString(),
        });
      }

      setItems(fetchedItems);
    } catch (error) {
      console.error('Failed to fetch files:', error);
    } finally {
      setIsLoading(false);
    }
  }, [initialPath, debouncedSearch]);

  useEffect(() => {
    fetchFiles();
    setSelectedItems(new Set());
  }, [fetchFiles]);

  const processedItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => {
      // Always put folders first, unless searching (where folders might not even be returned depending on search criteria)
      if (a.type === 'folder' && b.type !== 'folder') return -1;
      if (a.type !== 'folder' && b.type === 'folder') return 1;

      let comparison = 0;
      switch (sortConfig.column) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          const sizeA = a.size || 0;
          const sizeB = b.size || 0;
          comparison = sizeA - sizeB;
          break;
        case 'date':
          const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
          const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
      }
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [items, sortConfig]);

  const handleSort = (column: SortColumn) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Selection handlers
  const handleSelectItem = (id: string, checked: boolean) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const all = new Set(processedItems.map(item => item.type === 'file' ? item.url! : item.path));
      setSelectedItems(all);
    } else {
      setSelectedItems(new Set());
    }
  };

  // Create folder
  const handleCreateFolder = async (name: string) => {
    setIsOperating(true);
    try {
      await fetch('/api/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, path: initialPath || 'UniExamPrep' }),
      });
      await fetchFiles();
    } catch (error) {
      console.error('Failed to create folder:', error);
    } finally {
      setIsOperating(false);
    }
  };

  // Add course
  const handleAddCourse = async () => {
    const courseName = prompt('Enter Course Name (e.g. B.Sc Agriculture)');
    if (!courseName) return;
    
    setIsOperating(true);
    try {
      const slug = initialPath.split('/')[1]; // e.g., UniExamPrep/GEU -> GEU
      const res = await fetch('/api/course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, courseName }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to add course');
      } else {
        await fetchFiles();
      }
    } catch (error) {
      console.error('Failed to add course:', error);
      alert('Network error');
    } finally {
      setIsOperating(false);
    }
  };

  // Add department
  const handleAddDepartment = async () => {
    const departmentName = prompt('Enter Department Name (e.g. Electrical Engineering)');
    if (!departmentName) return;
    
    const numSemestersStr = prompt('Enter number of semesters (e.g. 8)');
    if (!numSemestersStr) return;
    
    const numSemesters = parseInt(numSemestersStr, 10);
    if (isNaN(numSemesters) || numSemesters <= 0) {
      alert('Please enter a valid number for semesters.');
      return;
    }

    setIsOperating(true);
    try {
      // initialPath e.g. UniExamPrep/GEU/B.Tech
      const parts = initialPath.split('/');
      const slug = parts[1];
      const courseCategory = parts[2];

      const res = await fetch('/api/department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, courseCategory, departmentName, numSemesters }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to add department');
      } else {
        await fetchFiles();
      }
    } catch (error) {
      console.error('Failed to add department:', error);
      alert('Network error');
    } finally {
      setIsOperating(false);
    }
  };

  // Delete single item
  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    setIsOperating(true);
    try {
      if (deleteTarget.type === 'file') {
        const res = await fetch('/api/files', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: deleteTarget.path, url: deleteTarget.url, id: deleteTarget.id }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to delete file');
          setIsOperating(false);
          return;
        }
      } else {
        const res = await fetch('/api/folder', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: deleteTarget.path, id: deleteTarget.id }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || 'Failed to delete folder');
          setIsOperating(false);
          return;
        }
      }
      setDeleteTarget(null);
      setSelectedItems(new Set());
      await fetchFiles();
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setIsOperating(false);
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    setIsOperating(true);
    try {
      for (const id of selectedItems) {
        const item = processedItems.find(i => (i.type === 'file' ? i.url : i.path) === id);
        if (!item) continue;

        if (item.type === 'file') {
          const res = await fetch('/api/files', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: item.path, url: item.url, id: item.id }),
          });
          if (!res.ok) {
            const data = await res.json();
            alert(`Failed to delete ${item.name}: ${data.error}`);
            continue;
          }
        } else {
          const res = await fetch('/api/folder', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: item.path, id: item.id }),
          });
          if (!res.ok) {
            const data = await res.json();
            alert(`Failed to delete ${item.name}: ${data.error}`);
            continue;
          }
        }
      }
      setSelectedItems(new Set());
      setIsBulkDelete(false);
      await fetchFiles();
    } catch (error) {
      console.error('Failed to bulk delete:', error);
    } finally {
      setIsOperating(false);
    }
  };

  // Move single item
  const handleMoveItem = async (destinationPath: string) => {
    if (!moveTarget) return;
    setIsOperating(true);
    try {
      if (moveTarget.type === 'file') {
        const destPath = destinationPath
          ? `${destinationPath}/${moveTarget.name}`
          : moveTarget.name;
        await fetch('/api/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'move-file',
            id: moveTarget.id,
            sourceUrl: moveTarget.url,
            sourcePath: moveTarget.path,
            destinationPath: destPath,
          }),
        });
      } else {
        const destPath = destinationPath
          ? `${destinationPath}/${moveTarget.name}`
          : moveTarget.name;
        await fetch('/api/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'move-folder',
            id: moveTarget.id,
            sourcePath: moveTarget.path,
            destinationPath: destPath,
          }),
        });
      }
      setMoveTarget(null);
      setSelectedItems(new Set());
      await fetchFiles();
    } catch (error) {
      console.error('Failed to move:', error);
    } finally {
      setIsOperating(false);
    }
  };

  // Bulk move
  const handleBulkMove = async (destinationPath: string) => {
    setIsOperating(true);
    try {
      for (const id of selectedItems) {
        const item = processedItems.find(i => (i.type === 'file' ? i.url : i.path) === id);
        if (!item) continue;

        if (item.type === 'file') {
          const destPath = destinationPath
            ? `${destinationPath}/${item.name}`
            : item.name;
          await fetch('/api/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'move-file',
              id: item.id,
              sourceUrl: item.url,
              sourcePath: item.path,
              destinationPath: destPath,
            }),
          });
        } else {
          const destPath = destinationPath
            ? `${destinationPath}/${item.name}`
            : item.name;
          await fetch('/api/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'move-folder',
              id: item.id,
              sourcePath: item.path,
              destinationPath: destPath,
            }),
          });
        }
      }
      setSelectedItems(new Set());
      setIsBulkMove(false);
      await fetchFiles();
    } catch (error) {
      console.error('Failed to bulk move:', error);
    } finally {
      setIsOperating(false);
    }
  };

  // Rename
  const handleRenameItem = async (item: FileItem, newName: string) => {
    if (item.type !== 'file') return;
    setIsOperating(true);
    try {
      await fetch('/api/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rename',
          id: item.id,
          sourceUrl: item.url,
          sourcePath: item.path,
          newName,
        }),
      });
      await fetchFiles();
    } catch (error) {
      console.error('Failed to rename:', error);
    } finally {
      setIsOperating(false);
    }
  };

  const handleGeneratePyqAnswer = async () => {
    const selectedUrl = Array.from(selectedItems)[0];
    const pdfFile = processedItems.find(i => (i.type === 'file' ? i.url : i.path) === selectedUrl);
    
    if (!pdfFile || !pdfFile.name.endsWith('.pdf')) {
      alert('Please select a single PDF file to generate an answer for.');
      return;
    }

    setIsOperating(true);
    try {
      // initialPath format inside PYQ: UniExamPrep/GEU/B.Tech/CSE/Semester-4/Career Skills/PYQ
      const subjectPath = initialPath.replace(/\/PYQ$/, '');
      const repo = initialPath.split('/')[1];

      const res = await fetch('/api/study/generate-pyq-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, subjectPath, pdfFile })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      alert('Successfully generated PYQ answers! You can view them in the ✨ My PYQ Answers folder.');
      setSelectedItems(new Set());
    } catch (err: any) {
      alert(err.message || 'Failed to generate PYQ answer');
    } finally {
      setIsOperating(false);
    }
  };

  const handleAIOrganizeClick = async () => {
    setIsAIOrganizeOpen(true);
    setIsAILoading(true);
    setAiMoves([]);
    setAiError(null);
    try {
      const res = await fetch('/api/organize/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: initialPath }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || 'Failed to generate plan.');
      } else if (data.moves) {
        setAiMoves(data.moves);
      }
    } catch (err: any) {
      console.error('Failed to get AI plan:', err);
      setAiError(err.message || 'Network error.');
    } finally {
      setIsAILoading(false);
    }
  };

  const handleAIOrganizeConfirm = async () => {
    try {
      const res = await fetch('/api/organize/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moves: aiMoves }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = data.details ? `${data.error}:\n${data.details.join('\n')}` : (data.error || 'Failed to execute plan');
        throw new Error(errorMsg);
      }
      
      setIsAIOrganizeOpen(false);
      await fetchFiles();
    } catch (err: any) {
      console.error('Failed to execute AI plan:', err);
      alert(err.message || 'Failed to organize files. Please try again.');
      setIsAIOrganizeOpen(false);
    }
  };



  return (
    <div className="file-browser">
      <div className="browser-header-top">
        <Breadcrumb path={initialPath} />
        
        <div className={`search-container ${isSearchOpen ? 'open' : ''}`}>
          <button 
            className="search-toggle-btn"
            onClick={() => {
              if (isSearchOpen && searchQuery) {
                setSearchQuery('');
              }
              setIsSearchOpen(!isSearchOpen);
            }}
            aria-label="Toggle search"
            title="Search"
          >
            {isSearchOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            )}
          </button>
          <div className="search-input-wrapper">
            <input
              type="text"
              className="top-search-input"
              placeholder="Search all child folders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="browser-divider" />



      {showJoinPrompt && username && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, background: 'var(--bg-primary)', overflow: 'auto' }}>
           <div style={{ position: 'absolute', top: '1rem', right: '2rem' }}>
             <button onClick={() => setShowJoinPrompt(false)} style={{ padding: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}>
               <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
             </button>
           </div>
           <JoinOrgPrompt username={username} />
        </div>
      )}

      <Toolbar
        isReadOnly={isReadOnly}
        onNewFolder={() => {
          setNewFolderTitle('New Folder');
          setShowNewFolder(true);
        }}
        onUpload={() => uploadInputRef.current?.click()}
        onAIOrganize={handleAIOrganizeClick}
        selectedCount={selectedItems.size}
        onMoveSelected={() => setIsBulkMove(true)}
        onDeleteSelected={() => setIsBulkDelete(true)}
        showAddUniversity={initialPath === 'UniExamPrep'}
        onAddUniversity={() => setShowAddUni(true)}
        showAddCourse={initialPath.split('/').length === 2 && initialPath.startsWith('UniExamPrep/')}
        onAddCourse={handleAddCourse}
        showAddDepartment={initialPath.split('/').length === 3 && initialPath.startsWith('UniExamPrep/')}
        onAddDepartment={handleAddDepartment}
        showAddSemester={initialPath.split('/').length === 4 && initialPath.startsWith('UniExamPrep/')}
        onAddSemester={() => {
          setNewFolderTitle('New Semester');
          setShowNewFolder(true);
        }}
        showAddSubject={initialPath.split('/').length === 5 && initialPath.startsWith('UniExamPrep/')}
        onAddSubject={() => {
          setNewFolderTitle('New Subject');
          setShowNewFolder(true);
        }}
        showExamButton={initialPath.split('/').length === 6 && initialPath.startsWith('UniExamPrep/')}
        onExamClick={() => setShowGenerateNotes(true)}
        showGenerateAnswer={initialPath.endsWith('/PYQ')}
        onGenerateAnswerClick={handleGeneratePyqAnswer}
      />

      {isOperating && (
        <div className="operation-bar">
          <div className="loading-spinner loading-spinner-sm" />
          <span>Processing...</span>
        </div>
      )}

      <FileList
        items={processedItems}
        selectedItems={selectedItems}
        onSelectItem={handleSelectItem}
        onSelectAll={handleSelectAll}
        onDeleteItem={(item) => setDeleteTarget(item)}
        onMoveItem={(item) => setMoveTarget(item)}
        onRenameItem={handleRenameItem}
        onPreviewItem={(item) => setPreviewTarget(item)}
        isLoading={isLoading}
        sortConfig={sortConfig}
        onSort={handleSort}
        isReadOnly={isReadOnly}
      />

      {!isReadOnly && (
        <UploadArea
          currentPath={initialPath}
          onUploadComplete={fetchFiles}
          inputRef={uploadInputRef}
        />
      )}

      {/* Dialogs */}
      <NewFolderDialog
        isOpen={showNewFolder}
        title={newFolderTitle}
        onClose={() => setShowNewFolder(false)}
        onConfirm={handleCreateFolder}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        itemName={deleteTarget?.name || ''}
        itemType={deleteTarget?.type || 'file'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteItem}
      />

      <DeleteConfirmDialog
        isOpen={isBulkDelete}
        itemName={`${selectedItems.size} items`}
        itemType="file"
        onClose={() => setIsBulkDelete(false)}
        onConfirm={handleBulkDelete}
      />

      <MoveDialog
        isOpen={!!moveTarget}
        itemName={moveTarget?.name || ''}
        itemType={moveTarget?.type || 'file'}
        currentPath={initialPath}
        onClose={() => setMoveTarget(null)}
        onConfirm={handleMoveItem}
      />

      <MoveDialog
        isOpen={isBulkMove}
        itemName={`${selectedItems.size} items`}
        itemType="file"
        currentPath={initialPath}
        onClose={() => setIsBulkMove(false)}
        onConfirm={handleBulkMove}
      />

      <FilePreview
        isOpen={!!previewTarget}
        fileName={previewTarget?.name || ''}
        fileUrl={previewTarget?.url || ''}
        onClose={() => setPreviewTarget(null)}
      />

      <AIOrganizeDialog
        isOpen={isAIOrganizeOpen}
        isLoading={isAILoading}
        moves={aiMoves}
        error={aiError}
        onClose={() => setIsAIOrganizeOpen(false)}
        onConfirm={handleAIOrganizeConfirm}
        currentPath={initialPath}
      />
      
      <AddUniversityModal
        isOpen={showAddUni}
        onClose={() => setShowAddUni(false)}
        onSuccess={() => {
          setShowAddUni(false);
          fetchFiles(); // Refresh file list to show new repo
        }}
      />

      <GenerateNotesModal
        isOpen={showGenerateNotes}
        onClose={() => setShowGenerateNotes(false)}
        subjectPath={initialPath}
        onSuccess={(chatId) => {
          alert('Study Session generated successfully! You can view it in the ✨ My Study Notes folder.');
        }}
      />
    </div>
  );
}
