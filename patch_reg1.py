import sys

path = r"C:\Users\mauricio.maciel\.gemini\antigravity\brain\0bbc0487-547a-4a7c-9065-1a05641d3408\Central-de-Pre-os\pages\Registries.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("import { Supplier, Material, Unit } from '../types';", "import { Supplier, Material, Unit, Category } from '../types';")

# Fix state types
content = content.replace("const [dbCategories, setDbCategories] = React.useState<string[]>([]);", "const [dbCategories, setDbCategories] = React.useState<Category[]>([]);")

content = content.replace("const [customCategories, setCustomCategories] = useState<string[]>([]);", "const [customCategories, setCustomCategories] = useState<Category[]>([]);")

content = content.replace("const [newCategoryInput, setNewCategoryInput] = useState('');", "const [newCategoryInput, setNewCategoryInput] = useState('');\n  const [newCategoryIpi, setNewCategoryIpi] = useState(0);")

# Fix uniqueCategories
old_unique_cats = """  const uniqueCategories = useMemo(() => {
    const baseCats = optimisticMaterials.map(m => m.category).filter(Boolean);
    const allCategories = [...baseCats, ...customCategories, ...dbCategories];
    return Array.from(new Set(allCategories)).sort();
  }, [optimisticMaterials, customCategories, dbCategories]);"""

new_unique_cats = """  const uniqueCategories = useMemo(() => {
    const baseCats = optimisticMaterials.map(m => m.category).filter(Boolean);
    const customCats = customCategories.map(c => c.name);
    const dbCats = dbCategories.map(c => c.name);
    const allCategories = [...baseCats, ...customCats, ...dbCats];
    return Array.from(new Set(allCategories)).sort();
  }, [optimisticMaterials, customCategories, dbCategories]);

  const getCategoryIpi = (catName: string) => {
    const fromDb = dbCategories.find(c => c.name === catName);
    if (fromDb) return fromDb.defaultIpi;
    const fromCustom = customCategories.find(c => c.name === catName);
    if (fromCustom) return fromCustom.defaultIpi;
    return 0;
  };"""
content = content.replace(old_unique_cats, new_unique_cats)

# Fix Category selection in form
old_select_cat = """                         <select 
                            required 
                            className={`${inputClass} appearance-none`} 
                            value={matForm.category} 
                            onChange={e => setMatForm({...matForm, category: e.target.value})}
                        >"""
                        
new_select_cat = """                         <select 
                            required 
                            className={`${inputClass} appearance-none`} 
                            value={matForm.category} 
                            onChange={e => {
                                const newCat = e.target.value;
                                setMatForm({...matForm, category: newCat, ipi: getCategoryIpi(newCat)});
                            }}
                        >"""
content = content.replace(old_select_cat, new_select_cat)

# Fix handleAddCustomCategory
old_add_cat = """  const handleAddCustomCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed || uniqueCategories.includes(trimmed)) {
        if (uniqueCategories.includes(trimmed)) showToast('Categoria já existe!', 'error');
        return;
    }
    // Optimistic UI update
    setCustomCategories(prev => [...prev, trimmed]);
    setDbCategories(prev => [...prev, trimmed]);
    setNewCategoryInput('');
    showToast('Categoria adicionada!', 'success');
    // Persist to DB
    StorageService.addCategory(trimmed)
        .catch(() => {
            // Rollback on failure
            setCustomCategories(prev => prev.filter(c => c !== trimmed));
            setDbCategories(prev => prev.filter(c => c !== trimmed));
            showToast('Erro ao salvar categoria no banco. Tente novamente.', 'error');
        });
  };"""

new_add_cat = """  const handleAddCustomCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed || uniqueCategories.includes(trimmed)) {
        if (uniqueCategories.includes(trimmed)) showToast('Categoria já existe!', 'error');
        return;
    }
    const newCatObj: Category = { name: trimmed, defaultIpi: newCategoryIpi };
    // Optimistic UI update
    setCustomCategories(prev => [...prev, newCatObj]);
    setDbCategories(prev => [...prev, newCatObj]);
    setNewCategoryInput('');
    setNewCategoryIpi(0);
    showToast('Categoria adicionada!', 'success');
    // Persist to DB
    StorageService.addCategory(newCatObj)
        .catch(() => {
            // Rollback on failure
            setCustomCategories(prev => prev.filter(c => c.name !== trimmed));
            setDbCategories(prev => prev.filter(c => c.name !== trimmed));
            showToast('Erro ao salvar categoria no banco. Tente novamente.', 'error');
        });
  };"""
content = content.replace(old_add_cat, new_add_cat)

# Fix handleUpdateCategory
old_update_cat = """  const handleUpdateCategory = async (oldCategory: string) => {
    const trimmedNewCat = editedCategoryName.trim();
    if (!trimmedNewCat || trimmedNewCat === oldCategory) {
        setEditingCategory(null);
        return;
    }
    
    try {
        setOptimisticMaterials(prev => prev.map(m => m.category === oldCategory ? { ...m, category: trimmedNewCat } : m));
        
        StorageService.updateCategory(oldCategory, trimmedNewCat)
            .then(() => refreshData())
            .catch(() => { showToast('Erro ao atualizar categoria no banco.', 'error'); refreshData(); });
            
        setEditingCategory(null);
        showToast('Categoria atualizada com sucesso!', 'success');
        
        // Update form if it was using the old category
        if (matForm.category === oldCategory) {
            setMatForm(prev => ({ ...prev, category: trimmedNewCat }));
        }
        if (categoryFilter === oldCategory) {
            setCategoryFilter(trimmedNewCat);
        }
    } catch (error) {
        showToast('Erro ao preparar atualização de categoria.', 'error');
    }
  };"""

new_update_cat = """  const [editedCategoryIpi, setEditedCategoryIpi] = useState(0);
  
  const handleUpdateCategory = async (oldCategory: string) => {
    const trimmedNewCat = editedCategoryName.trim();
    if (!trimmedNewCat) {
        setEditingCategory(null);
        return;
    }
    
    try {
        if (trimmedNewCat !== oldCategory) {
            setOptimisticMaterials(prev => prev.map(m => m.category === oldCategory ? { ...m, category: trimmedNewCat } : m));
        }
        
        const updatedCatObj: Category = { name: trimmedNewCat, defaultIpi: editedCategoryIpi };
        StorageService.updateCategory(oldCategory, updatedCatObj)
            .then(() => refreshData())
            .catch(() => { showToast('Erro ao atualizar categoria no banco.', 'error'); refreshData(); });
            
        setEditingCategory(null);
        showToast('Categoria atualizada com sucesso!', 'success');
        
        // Update form if it was using the old category
        if (matForm.category === oldCategory) {
            setMatForm(prev => ({ ...prev, category: trimmedNewCat, ipi: editedCategoryIpi }));
        }
        if (categoryFilter === oldCategory) {
            setCategoryFilter(trimmedNewCat);
        }
    } catch (error) {
        showToast('Erro ao preparar atualização de categoria.', 'error');
    }
  };"""
content = content.replace(old_update_cat, new_update_cat)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Registries.tsx part 1")
