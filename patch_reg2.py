import sys

path = r"C:\Users\mauricio.maciel\.gemini\antigravity\brain\0bbc0487-547a-4a7c-9065-1a05641d3408\Central-de-Pre-os\pages\Registries.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix Category UI inputs for IPI
old_ui_add = """              <div className="flex gap-2 mb-4">
                  <input 
                      type="text" 
                      placeholder="Nova categoria..."
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCategory()}
                      className="flex-1 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
                  />
                  <button 
                      onClick={handleAddCustomCategory}
                      disabled={!newCategoryInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                      <Plus size={16} /> Adicionar
                  </button>
              </div>"""

new_ui_add = """              <div className="flex gap-2 mb-4 items-end">
                  <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 tracking-wide">Nome da Categoria</label>
                      <input 
                          type="text" 
                          placeholder="Ex: Aço Carbono"
                          value={newCategoryInput}
                          onChange={(e) => setNewCategoryInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCategory()}
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
                      />
                  </div>
                  <div className="w-24">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1 tracking-wide">IPI (%)</label>
                      <input 
                          type="number" 
                          placeholder="0"
                          step="0.1"
                          value={newCategoryIpi}
                          onChange={(e) => setNewCategoryIpi(parseFloat(e.target.value) || 0)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCategory()}
                          className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
                      />
                  </div>
                  <button 
                      onClick={handleAddCustomCategory}
                      disabled={!newCategoryInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 h-[38px] rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                  >
                      <Plus size={16} /> Adicionar
                  </button>
              </div>"""
content = content.replace(old_ui_add, new_ui_add)

old_ui_edit = """                                  <div className="flex-1 flex items-center gap-2 mr-2">
                                      <input 
                                          type="text" 
                                          value={editedCategoryName}
                                          onChange={(e) => setEditedCategoryName(e.target.value)}
                                          className="flex-1 border border-blue-300 dark:border-blue-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                          autoFocus
                                      />
                                      <button 
                                          onClick={() => handleUpdateCategory(category)}
                                          disabled={isLoading}
                                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                                          title="Salvar"
                                      >
                                          <CheckCircle2 size={16} />
                                      </button>
                                      <button 
                                          onClick={() => setEditingCategory(null)}
                                          disabled={isLoading}
                                          className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                                          title="Cancelar"
                                      >
                                          <X size={16} />
                                      </button>
                                  </div>"""

new_ui_edit = """                                  <div className="flex-1 flex items-center gap-2 mr-2">
                                      <input 
                                          type="text" 
                                          value={editedCategoryName}
                                          onChange={(e) => setEditedCategoryName(e.target.value)}
                                          className="flex-1 border border-blue-300 dark:border-blue-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                          autoFocus
                                      />
                                      <input 
                                          type="number"
                                          step="0.1"
                                          value={editedCategoryIpi}
                                          onChange={(e) => setEditedCategoryIpi(parseFloat(e.target.value) || 0)}
                                          className="w-16 border border-blue-300 dark:border-blue-600 rounded px-2 py-1 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                                          title="IPI (%)"
                                      />
                                      <button 
                                          onClick={() => handleUpdateCategory(category)}
                                          disabled={isLoading}
                                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-md transition-colors"
                                          title="Salvar"
                                      >
                                          <CheckCircle2 size={16} />
                                      </button>
                                      <button 
                                          onClick={() => setEditingCategory(null)}
                                          disabled={isLoading}
                                          className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                                          title="Cancelar"
                                      >
                                          <X size={16} />
                                      </button>
                                  </div>"""
content = content.replace(old_ui_edit, new_ui_edit)

old_ui_edit_btn = """                                              onClick={() => {
                                                  setEditingCategory(category);
                                                  setEditedCategoryName(category);
                                              }}"""
                                              
new_ui_edit_btn = """                                              onClick={() => {
                                                  setEditingCategory(category);
                                                  setEditedCategoryName(category);
                                                  setEditedCategoryIpi(getCategoryIpi(category));
                                              }}"""
content = content.replace(old_ui_edit_btn, new_ui_edit_btn)

old_ui_cat_display = """<span className="text-sm font-medium text-slate-700 dark:text-slate-300">{category}</span>"""
new_ui_cat_display = """<div className="flex flex-col"><span className="text-sm font-medium text-slate-700 dark:text-slate-300">{category}</span><span className="text-[10px] text-slate-500">IPI Padrão: {getCategoryIpi(category)}%</span></div>"""
content = content.replace(old_ui_cat_display, new_ui_cat_display)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Registries.tsx part 2")
