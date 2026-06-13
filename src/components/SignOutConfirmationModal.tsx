import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, X, HelpCircle } from 'lucide-react';

interface SignOutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SignOutConfirmationModal({
  isOpen,
  onClose,
  onConfirm
}: SignOutConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.15 }}
            className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-xl border border-slate-100 z-10 space-y-5"
          >
            {/* Header Content */}
            <div className="text-center pt-2 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                <LogOut size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  Confirm Sign Out
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed px-2">
                  Are you sure you want to log out of TrackWise? You will need to enter your credentials to return to your workspace.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 transition-colors cursor-pointer select-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl transition-colors shadow-sm cursor-pointer select-none flex items-center justify-center gap-1.5"
              >
                Sign Out
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              <X size={16} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
