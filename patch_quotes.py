import sys

path = r"C:\Users\mauricio.maciel\.gemini\antigravity\brain\0bbc0487-547a-4a7c-9065-1a05641d3408\Central-de-Pre-os\pages\Quotes.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("import { Quote, Supplier, Material, Unit, QuoteStatus } from '../types';", "import { Quote, Supplier, Material, Unit, QuoteStatus, Category } from '../types';")
content = content.replace("const [dbCategories, setDbCategories] = useState<string[]>([]);", "const [dbCategories, setDbCategories] = useState<Category[]>([]);")

# uniqueCategories
old_unique_cats = """  const uniqueCategories = useMemo(() => {
    const baseCats = materials.map(m => m.category).filter(Boolean);
    const allCategories = [...baseCats, ...dbCategories];
    return Array.from(new Set(allCategories)).sort();
  }, [materials, dbCategories]);"""

new_unique_cats = """  const uniqueCategories = useMemo(() => {
    const baseCats = materials.map(m => m.category).filter(Boolean);
    const dbCats = dbCategories.map(c => c.name);
    const allCategories = [...baseCats, ...dbCats];
    return Array.from(new Set(allCategories)).sort();
  }, [materials, dbCategories]);

  const getCategoryIpi = (catName: string) => {
    const fromDb = dbCategories.find(c => c.name === catName);
    if (fromDb) return fromDb.defaultIpi;
    return 0;
  };"""
content = content.replace(old_unique_cats, new_unique_cats)

# category selection
old_select_cat = """                                    <select 
                                        required 
                                        className={`${inputClass} appearance-none`} 
                                        value={newMaterialForm.category} 
                                        onChange={e => setNewMaterialForm({...newMaterialForm, category: e.target.value})}
                                    >"""

new_select_cat = """                                    <select 
                                        required 
                                        className={`${inputClass} appearance-none`} 
                                        value={newMaterialForm.category} 
                                        onChange={e => {
                                            const newCat = e.target.value;
                                            setNewMaterialForm({...newMaterialForm, category: newCat, ipi: getCategoryIpi(newCat)});
                                        }}
                                    >"""
content = content.replace(old_select_cat, new_select_cat)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated Quotes.tsx")
