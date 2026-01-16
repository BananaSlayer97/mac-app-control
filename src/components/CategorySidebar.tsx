import { Reorder } from "framer-motion";

export default function CategorySidebar({
  categories,
  selectedCategory,
  navigationArea,
  selectedSideIndex,
  categoryIcons,
  getCategoryCount,
  onReorder,
  onSelectCategory,
}: {
  categories: string[];
  selectedCategory: string;
  navigationArea: "sidebar" | "grid";
  selectedSideIndex: number;
  categoryIcons: Record<string, string>;
  getCategoryCount: (category: string) => number;
  onReorder: (newOrder: string[]) => void;
  onSelectCategory: (category: string, index: number) => void;
}) {
  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Categories</h2>
      <Reorder.Group
        axis="y"
        values={categories}
        onReorder={onReorder}
        className="categories-list"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        {categories.map((category, index) => (
          <Reorder.Item key={category} value={category} className="category-item-wrapper">
            <div
              className={`category-item ${selectedCategory === category ? "active" : ""} ${
                navigationArea === "sidebar" && selectedSideIndex === index ? "selected" : ""
              }`}
              onClick={() => onSelectCategory(category, index)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div className="category-header">
                <span className="category-icon">{categoryIcons[category] || "📁"}</span>
                <span className="category-name">{category}</span>
              </div>
              <span className="category-count">{getCategoryCount(category)}</span>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </aside>
  );
}

