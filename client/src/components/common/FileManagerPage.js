import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, FileText, MoreVertical, Folder, Star, ChevronDown, Music, Upload, X, AlertCircle } from 'lucide-react';
import { fileManagerAPI } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const FileManagerPage = ({ department }) => {
  const { user, isAuthenticated } = useAuth();
  const [allFiles, setAllFiles] = useState([]);
  const [files, setFiles] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [folders, setFolders] = useState([]);
  const [storageStats, setStorageStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const modalFileInputRef = useRef(null);
  const sidebarFileInputRef = useRef(null);

  const userId = user?.id;

  useEffect(() => {
    if (department) {
      const filterFn = (item) => (
        (department === 'Marketing' && (item.department === 'Marketing' || item.category === 'Marketing')) ||
        (department === 'IT' && (item.department === 'IT' || item.category === 'IT'))
      );
      setFiles(allFiles.filter(filterFn));
      setFolders(allFolders.filter(filterFn));
    } else {
      setFiles(allFiles);
      setFolders(allFolders);
    }
  }, [allFiles, allFolders, department]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [filesData, foldersData, statsData] = await Promise.all([
        fileManagerAPI.getFiles(userId),
        fileManagerAPI.getFolders(userId),
        fileManagerAPI.getStorageStats(userId)
      ]);

      setAllFiles(filesData);
      setAllFolders(foldersData);
      setStorageStats(statsData);

      const favoriteIds = new Set();
      filesData.forEach(file => {
        if (file.is_favorite) {
          favoriteIds.add(file.id);
        }
      });
      setFavorites(favoriteIds);

      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load files and folders');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [userId, fetchData]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      await fileManagerAPI.createFolder({
        name: newFolderName,
        storageType: 'Internal',
        userId
      });
      setNewFolderName('');
      setShowCreateFolderModal(false);
      fetchData();
    } catch (err) {
      console.error('Error creating folder:', err);
      setError('Failed to create folder');
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      for (const file of selectedFiles) {
        await fileManagerAPI.uploadFile({
          name: file.name,
          fileType: file.type.split('/')[0] || 'Doc',
          sizeBytes: file.size,
          storageType: 'Internal',
          userId,
          mimeType: file.type
        });
      }

      setShowUploadModal(false);

      if (modalFileInputRef.current) {
        modalFileInputRef.current.value = '';
      }
      if (sidebarFileInputRef.current) {
        sidebarFileInputRef.current.value = '';
      }

      await fetchData();
    } catch (err) {
      console.error('Error uploading files:', err);
      setError('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const toggleFavorite = async (fileId, isFavorite) => {
    try {
      await fileManagerAPI.updateFileFavorite(fileId, !isFavorite);

      const newFavorites = new Set(favorites);
      if (newFavorites.has(fileId)) {
        newFavorites.delete(fileId);
      } else {
        newFavorites.add(fileId);
      }
      setFavorites(newFavorites);

      setAllFiles(allFiles.map(f =>
        f.id === fileId ? { ...f, is_favorite: !isFavorite } : f
      ));
    } catch (err) {
      console.error('Error updating favorite:', err);
      setError('Failed to update favorite');
    }
  };

  const handleDeleteFile = async (fileId) => {
    try {
      await fileManagerAPI.deleteFile(fileId);
      fetchData();
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
    }
  };

  const handleDeleteFolder = async (folderId) => {
    try {
      await fileManagerAPI.deleteFolder(folderId);
      fetchData();
    } catch (err) {
      console.error('Error deleting folder:', err);
      setError('Failed to delete folder');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const recentFolders = folders.slice(0, 3);
  const recentFiles = files.slice(0, 6);

  const storages = [
    { name: 'Dropbox', files: storageStats.find(s => s.storage_type === 'Dropbox')?.file_count || 0, size: formatBytes(storageStats.find(s => s.storage_type === 'Dropbox')?.total_size || 0) },
    { name: 'Google Drive', files: storageStats.find(s => s.storage_type === 'Google Drive')?.file_count || 0, size: formatBytes(storageStats.find(s => s.storage_type === 'Google Drive')?.total_size || 0) },
    { name: 'Cloud Storage', files: storageStats.find(s => s.storage_type === 'Cloud Storage')?.file_count || 0, size: formatBytes(storageStats.find(s => s.storage_type === 'Cloud Storage')?.total_size || 0) },
    { name: 'Internal Storage', files: storageStats.find(s => s.storage_type === 'Internal')?.file_count || 0, size: formatBytes(storageStats.find(s => s.storage_type === 'Internal')?.total_size || 0) }
  ];

  if (!isAuthenticated) {
    return (
      <div className="p-3 sm:p-3 lg:p-3 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded  shadow-lgp-3 ">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
            <AlertCircle size={24} className="text-red " />
          </div>
          <h2 className="text-xl  text-gray-900 text-center mb-2">Authentication Required</h2>
          <p className="text-gray-600 text-center mb-6">Please log in to access the File Manager</p>
          <a href="/login" className="block w-full text-center p-2  bg-red-600 text-white rounded  hover:bg-red-700 transition-colors  ">
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-3 lg:p-3 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-3 lg:p-3 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded ">
            {error}
          </div>
        )}

        <div className="mb-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl  text-gray-900">File Manager</h1>
            <div className="flex items-center gap-2 text-xs  text-gray-600 mt-2">
              <button className="text-gray-600 hover:text-gray-900">Home</button>
              <span>›</span>
              <button className="text-gray-600 hover:text-gray-900">Applications</button>
              <span>›</span>
              <span>File Manager</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 p-2  bg-red-600  text-white rounded  hover:bg-blue-700 transition-smooth   text-xs ">
              <Upload size={18} />
              Upload
            </button>
            <button onClick={() => setShowCreateFolderModal(true)} className="flex items-center gap-2 p-2  bg-red-600 text-white rounded  hover:bg-red-700 transition-smooth   text-xs text-xs ">
              <Plus size={18} />
              Create Folder
            </button>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="w-64 flex-shrink-0">
            <div className="mb-4">
              <div className="relative">
                <select className="w-full p-2  border border-gray-300 rounded  text-xs    text-gray-700 bg-white hover:border-gray-400 appearance-none cursor-pointer">
                  <option>All Files</option>
                  <option>Music</option>
                  <option>Video</option>
                  <option>Documents</option>
                  <option>Photos</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1F2020] pointer-events-none" />
              </div>
            </div>

            <div className="space-y-3">
              {storages.map((storage) => (
                <div key={storage.name} className="bg-white border border-gray-200 rounded  p-2 hover: transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xs   text-gray-900">{storage.name}</h3>
                      <p className="text-xs text-gray-600">{storage.files} Files</p>
                      <p className="text-xs text-gray-600">{storage.size}</p>
                    </div>
                    <button className="text-[#1F2020] hover:text-gray-600">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-gray-200 rounded  p-2 mt-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white  text-xs ">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <div>
                  <p className="text-xs   text-gray-900">{user?.first_name} {user?.last_name}</p>
                  <p className="text-xs text-gray-600">{user?.email}</p>
                </div>
              </div>
              <label htmlFor="drop-file-input" className="cursor-pointer">
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded p-3  text-center hover:bg-gray-100 transition-colors">
                  <p className="text-xs    text-gray-700">Drop files here</p>
                  <p className="text-xs text-gray-600 mt-1">Select files to upload</p>
                </div>
              </label>
              <input ref={sidebarFileInputRef} id="drop-file-input" type="file" multiple onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </div>

            <div className="mt-4 space-y-2">
              <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                <Folder size={16} />
                All Folder / Files
              </button>
              <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                <Folder size={16} />
                Drive
              </button>
              <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                <Folder size={16} />
                Dropbox
              </button>
              <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                <Folder size={16} />
                Shared with Me
              </button>
              <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                <Folder size={16} />
                Document
              </button>
              <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                <Folder size={16} />
                Recent File
              </button>
              <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                <Star size={16} />
                Important
              </button>
              <button className="w-full text-left p-2  text-xs  text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2">
                <Music size={16} />
                Media
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded  p-2 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs   text-gray-900">Storage Details</h4>
                <span className="bg-green-100 text-green-700 p-1  rounded text-xs  ">Used 77%</span>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Music</span>
                  <span className="text-gray-900  ">8.5 GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Video</span>
                  <span className="text-gray-900  ">2 GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Documents</span>
                  <span className="text-gray-900  ">24.5 GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Photos</span>
                  <span className="text-gray-900  ">8.5 GB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Other</span>
                  <span className="text-gray-900  ">16.2 GB</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="bg-white border border-gray-200 rounded p-3  mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg  text-gray-900">Quick Access</h2>
                <button className="text-xs  text-red  hover:text-red-700  ">View All</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {recentFiles.length > 0 ? recentFiles.map((file) => (
                  <div key={file.id} className="text-center">
                    <div className="bg-gray-100 rounded  p-2 mb-2 hover:bg-gray-200 cursor-pointer transition-colors">
                      <FileText size={24} className="mx-auto text-gray-600" />
                    </div>
                    <p className="text-xs text-gray-700   truncate">{file.name}</p>
                    <p className="text-xs text-red ">{formatBytes(file.size_bytes)}</p>
                  </div>
                )) : (
                  <div className="col-span-6 text-center py-8 text-gray-500">
                    No files yet. Upload some files to get started.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded p-3  mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg  text-gray-900">Recent Folders</h2>
                <div className="relative">
                  <select className="px-3 py-1 border border-gray-300 rounded text-xs   text-gray-700 bg-white appearance-none cursor-pointer">
                    <option>Last 7 Days</option>
                    <option>Last Month</option>
                    <option>Last Year</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1F2020] pointer-events-none" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recentFolders.length > 0 ? recentFolders.map((folder) => (
                  <div key={folder.id} className="bg-gray-50 border border-gray-200 rounded  p-2 hover: transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <Folder size={24} className="text-white " />
                      <button onClick={() => handleDeleteFolder(folder.id)} className="text-[#1F2020] hover:text-gray-600">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                    <h3 className="text-xs   text-gray-900 mb-1">{folder.name}</h3>
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{formatBytes(folder.size_bytes)}</span>
                      <span>{folder.file_count} files</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      <img src="https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-07.jpg" alt="user" className="w-6 h-6 rounded-full" />
                      <img src="https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-02.jpg" alt="user" className="w-6 h-6 rounded-full" />
                    </div>
                  </div>
                )) : (
                  <div className="col-span-3 text-center py-8 text-gray-500">
                    No folders yet. Create a new folder to organize your files.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded ">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg  text-gray-900">Recent Files</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <select className="px-3 py-1 border border-gray-300 rounded text-xs   text-gray-700 bg-white appearance-none cursor-pointer">
                      <option>Last Modified</option>
                      <option>Newest to Oldest</option>
                      <option>Oldest to Newest</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1F2020] pointer-events-none" />
                  </div>
                  <button className="text-xs  text-red  hover:text-red-700  ">View All</button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Name</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Size</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Type</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Modified</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Share</th>
                      <th className="px-6 py-3 text-left text-xs  text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.length > 0 ? files.map((file) => (
                      <tr key={file.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                        <td className="p-2  flex items-center gap-2">
                          <FileText size={16} className="text-gray-600" />
                          <span className="text-xs    text-gray-900">{file.name}</span>
                        </td>
                        <td className="p-2  text-xs  text-gray-700">{formatBytes(file.size_bytes)}</td>
                        <td className="p-2  text-xs  text-gray-700">{file.file_type}</td>
                        <td className="p-2  text-xs  text-gray-700">{new Date(file.created_at).toLocaleDateString()}</td>
                        <td className="p-2 ">
                          <div className="flex items-center gap-1">
                            <img src="https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-03.jpg" alt="user" className="w-6 h-6 rounded-full" />
                            <img src="https://preadmin.dreamstechnologies.com/html/crm/assets/img/profiles/avatar-04.jpg" alt="user" className="w-6 h-6 rounded-full" />
                          </div>
                        </td>
                        <td className="p-2 ">
                          <div className="flex items-center gap-2">
                            <button onClick={() => toggleFavorite(file.id, file.is_favorite)} className={`p-1.5 rounded transition-colors ${favorites.has(file.id) ? 'text-yellow-500' : 'text-gray-600 hover:text-gray-900'} hover:bg-gray-100`}>
                              <Star size={16} fill={favorites.has(file.id) ? 'currentColor' : 'none'} />
                            </button>
                            <button onClick={() => handleDeleteFile(file.id)} className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors">
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                          No files yet. Upload files to see them here.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {showCreateFolderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded  shadow-xlp-3  w-96">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl  text-gray-900">Create New Folder</h2>
                <button onClick={() => setShowCreateFolderModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
                className="w-full p-2  border border-gray-300 rounded  mb-4 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowCreateFolderModal(false)} className="p-2  border border-gray-300 rounded  text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button onClick={handleCreateFolder} className="p-2  bg-red-600 text-white rounded  hover:bg-red-700">
                  Create
                </button>
              </div>
            </div>
          </div>
        )}

        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded  shadow-xlp-3  w-96">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl  text-gray-900">Upload Files</h2>
                <button onClick={() => setShowUploadModal(false)} disabled={uploading} className="text-gray-500 hover:text-gray-700 disabled:opacity-50">
                  <X size={20} />
                </button>
              </div>
              <div className="border-2 border-dashed border-gray-300 rounded  p-8 text-center mb-4 hover:border-gray-400 transition-colors">
                <input
                  ref={modalFileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-input"
                  disabled={uploading}
                />
                <label htmlFor="file-input" className={`cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400 mx-auto mb-2"></div>
                      <p className="text-gray-600   mb-1">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <Upload size={32} className="mx-auto mb-2 text-[#1F2020]" />
                      <p className="text-gray-600   mb-1">Click to select files</p>
                      <p className="text-xs text-gray-500">or drag and drop</p>
                    </>
                  )}
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowUploadModal(false)} disabled={uploading} className="p-2  border border-gray-300 rounded  text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileManagerPage;
