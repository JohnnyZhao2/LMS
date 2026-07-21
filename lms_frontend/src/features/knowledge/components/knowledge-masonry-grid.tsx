import * as React from 'react';

interface KnowledgeMasonryGridProps {
  children: React.ReactNode;
  columnGap?: number;
  itemGap?: number;
  minColumnWidth?: number;
}

interface KnowledgeMasonryItemProps {
  children: React.ReactNode;
  itemGap: number;
}

const KnowledgeMasonryItem: React.FC<KnowledgeMasonryItemProps> = ({ children, itemGap }) => {
  const itemRef = React.useRef<HTMLDivElement | null>(null);
  const [rowSpan, setRowSpan] = React.useState(1);

  React.useLayoutEffect(() => {
    const item = itemRef.current;
    const content = item?.firstElementChild;
    if (!item || !(content instanceof HTMLElement)) return;

    const updateRowSpan = () => {
      setRowSpan(Math.ceil(content.getBoundingClientRect().height + itemGap));
    };

    updateRowSpan();
    const resizeObserver = new ResizeObserver(updateRowSpan);
    resizeObserver.observe(content);

    return () => resizeObserver.disconnect();
  }, [itemGap]);

  return (
    <div
      ref={itemRef}
      className="min-w-0"
      style={{ gridRowEnd: `span ${rowSpan}` }}
    >
      {children}
    </div>
  );
};

export const KnowledgeMasonryGrid: React.FC<KnowledgeMasonryGridProps> = ({
  children,
  columnGap = 25,
  itemGap = 22,
  minColumnWidth = 280,
}) => (
  <div
    className="grid items-start"
    style={{
      gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minColumnWidth}px), 1fr))`,
      gridAutoRows: 1,
      columnGap,
    }}
  >
    {React.Children.toArray(children).map((child, index) => (
      <KnowledgeMasonryItem
        key={React.isValidElement(child) ? child.key : index}
        itemGap={itemGap}
      >
        {child}
      </KnowledgeMasonryItem>
    ))}
  </div>
);
