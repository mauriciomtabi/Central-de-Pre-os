import sys

path = r"C:\Users\mauricio.maciel\.gemini\antigravity\brain\0bbc0487-547a-4a7c-9065-1a05641d3408\Central-de-Pre-os\services\storageService.ts"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("import { Quote, Supplier, Material, Unit, QuoteStatus, SimulationScenario } from \"../types\";", "import { Quote, Supplier, Material, Unit, QuoteStatus, SimulationScenario, Category } from \"../types\";")
content = content.replace("categories: null as string[] | null,", "categories: null as Category[] | null,")
content = content.replace("getCategories: async (forceRefresh = false): Promise<string[]> => {", "getCategories: async (forceRefresh = false): Promise<Category[]> => {")

old_get_categories_body = """    if (!forceRefresh && memoryCache.categories) return memoryCache.categories;
    try {
      const { companyId } = await getContext();
      const { data, error } = await supabase
          .from('categories')
          .select('name')
          .eq('company_id', companyId)
          .order('name', { ascending: true });
      if (error) throw error;
      const cats = (data || []).map((r: any) => r.name as string);
      memoryCache.categories = cats;
      return cats;
    } catch (e: any) {
      if (e.message === ERROR_NO_COMPANY) return [];
      return memoryCache.categories || [];
    }"""

new_get_categories_body = """    if (!forceRefresh && memoryCache.categories) return memoryCache.categories;
    try {
      const { companyId } = await getContext();
      const { data, error } = await supabase
          .from('categories')
          .select('id, name, default_ipi')
          .eq('company_id', companyId)
          .order('name', { ascending: true });
      if (error) throw error;
      const cats: Category[] = (data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        defaultIpi: Number(r.default_ipi) || 0,
        companyId: companyId
      }));
      memoryCache.categories = cats;
      return cats;
    } catch (e: any) {
      if (e.message === ERROR_NO_COMPANY) return [];
      return memoryCache.categories || [];
    }"""

content = content.replace(old_get_categories_body, new_get_categories_body)

old_update_cat = """  updateCategory: async (oldCategory: string, newCategory: string) => {
    const { companyId } = await getContext();
    const { error: matError } = await withTimeout(
        supabase.from('materials').update({
          category: newCategory
        }).eq('category', oldCategory).eq('company_id', companyId)
    );
    if (matError) throw new Error(matError.message);

    await withTimeout(
        supabase.from('categories').update({ name: newCategory })
            .eq('name', oldCategory).eq('company_id', companyId)
    );

    memoryCache.materials = null;
    memoryCache.categories = null;
  },"""

new_update_cat = """  updateCategory: async (oldCategory: string, newCategory: Category) => {
    const { companyId } = await getContext();
    const { error: matError } = await withTimeout(
        supabase.from('materials').update({
          category: newCategory.name
        }).eq('category', oldCategory).eq('company_id', companyId)
    );
    if (matError) throw new Error(matError.message);

    await withTimeout(
        supabase.from('categories').update({ name: newCategory.name, default_ipi: newCategory.defaultIpi })
            .eq('name', oldCategory).eq('company_id', companyId)
    );

    memoryCache.materials = null;
    memoryCache.categories = null;
  },"""

content = content.replace(old_update_cat, new_update_cat)

old_add_cat = """  addCategory: async (categoryName: string) => {
    const { companyId } = await getContext();
    const { error } = await withTimeout(
        supabase.from('categories').upsert({
          name: categoryName,
          company_id: companyId
        }, { onConflict: 'name,company_id' })
    );
    if (error) throw new Error(error.message);
    memoryCache.categories = null;
  },"""

new_add_cat = """  addCategory: async (category: Category) => {
    const { companyId } = await getContext();
    const { error } = await withTimeout(
        supabase.from('categories').upsert({
          name: category.name,
          default_ipi: category.defaultIpi,
          company_id: companyId
        }, { onConflict: 'name,company_id' })
    );
    if (error) throw new Error(error.message);
    memoryCache.categories = null;
  },"""

content = content.replace(old_add_cat, new_add_cat)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated storageService.ts")
