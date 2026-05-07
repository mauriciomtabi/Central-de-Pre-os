import sys

path = r"C:\Users\mauricio.maciel\.gemini\antigravity\brain\0bbc0487-547a-4a7c-9065-1a05641d3408\Central-de-Pre-os\pages\Quotes.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("import { Quote, Supplier, Material, Unit, QuoteStatus, FreightType } from '../types';", "import { Quote, Supplier, Material, Unit, QuoteStatus, FreightType, Category } from '../types';")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
