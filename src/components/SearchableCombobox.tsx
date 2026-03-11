import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';

interface ComboboxItem {
  id: string;
  name: string;
}

interface SearchableComboboxProps {
  items: ComboboxItem[];
  selectedId: string;
  onChange: (id: string) => void;
  placeholder: string;
}

const DROPDOWN_MAX_HEIGHT = 240; // max-h-60 = 15rem = 240px
const COLLISION_PADDING = 10;

export default function SearchableCombobox({
  items,
  selectedId,
  onChange,
  placeholder,
}: SearchableComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openUpward, setOpenUpward] = useState(false);

  // Calculate whether dropdown should open upward based on available space
  const calculatePosition = useCallback(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - COLLISION_PADDING;
    const spaceAbove = rect.top - COLLISION_PADDING;
    
    // If not enough space below and more space above, open upward
    if (spaceBelow < DROPDOWN_MAX_HEIGHT && spaceAbove > spaceBelow) {
      setOpenUpward(true);
    } else {
      setOpenUpward(false);
    }
  }, []);

  const selectedItem = useMemo(
    () => items.find(item => item.id === selectedId) || null,
    [items, selectedId]
  );

  const filteredItems = useMemo(
    () =>
      items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  useEffect(() => {
    if (!isOpen) {
      setSearch(selectedItem?.name || '');
      setActiveIndex(-1);
    } else {
      // Calculate position when dropdown opens
      calculatePosition();
    }
  }, [isOpen, selectedItem, calculatePosition]);

  // Recalculate position on window resize/scroll while open
  useEffect(() => {
    if (!isOpen) return;

    const handleReposition = () => calculatePosition();
    
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSelect = (item: ComboboxItem) => {
    onChange(item.id);
    setSearch(item.name);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleInputChange = (value: string) => {
    setSearch(value);
    setIsOpen(true);
    setActiveIndex(0);

    if (selectedItem && value !== selectedItem.name) {
      onChange('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setIsOpen(true);
      setActiveIndex(0);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex(prev =>
        Math.min(prev + 1, Math.max(filteredItems.length - 1, 0))
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      if (isOpen && activeIndex >= 0 && filteredItems[activeIndex]) {
        event.preventDefault();
        handleSelect(filteredItems[activeIndex]);
      }
      return;
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (activeIndex < 0) {
      setActiveIndex(0);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        value={search}
        onFocus={handleInputFocus}
        onClick={handleInputFocus}
        onChange={e => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border rounded-lg border-neutral-700 bg-neutral-900 text-white focus:ring-2 focus:ring-blue-500"
      />

      {isOpen && (
        <div 
          ref={dropdownRef}
          className={`absolute z-9999 w-full rounded-lg border border-neutral-700 bg-neutral-900 shadow-lg ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          <div className="px-3 py-2 text-xs text-neutral-400">Pilih barang</div>
          <div className="border-t border-neutral-700" />
          <div
            className="max-h-60 overflow-y-auto overscroll-contain touch-pan-y scroll-optimized"
          >
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => {
                const isActive = index === activeIndex;
                const isSelected = item.id === selectedId;

                return (
                  <div
                    key={item.id}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleSelect(item)}
                    className={`px-3 py-3 text-sm cursor-pointer hover:bg-neutral-800 ${
                      isSelected || isActive ? 'bg-neutral-800' : ''
                    }`}
                  >
                    {item.name}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-3 text-sm text-neutral-400">No items found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
