import { motion } from "framer-motion";

const emptyMessages = [
  "Nothing to see here... yet! 📦",
  "A clean slate. Ready for your apps! ✨",
  "It's quiet... too quiet. 🍃",
  "This category is lonely. Add some friends! 🤖",
  "No apps found. Did they go on vacation? 🏖️",
  "Empty space, infinite possibilities. 🌌",
];

export default function EmptyState({ category }: { category: string }) {
  // Deterministic message based on category string length to avoid hydration mismatch
  // or just random if we don't care about SSR (Tauri is CSR)
  const messageIndex = category.length % emptyMessages.length;
  const message = emptyMessages[messageIndex];

  return (
    <motion.div
      className="empty-state-container"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="empty-icon">🤷‍♂️</div>
      <h3 className="empty-title">No apps in "{category}"</h3>
      <p className="empty-message">{message}</p>
    </motion.div>
  );
}
