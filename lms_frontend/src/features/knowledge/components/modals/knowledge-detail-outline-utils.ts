export type KnowledgeOutlineItem = {
  id: string;
  level: number;
  title: string;
};

export function getKnowledgeOutlineItems(content: string): KnowledgeOutlineItem[] {
  if (!content.trim()) {
    return [];
  }

  const document = new DOMParser().parseFromString(content, 'text/html');
  return Array.from(document.body.querySelectorAll('h1,h2,h3,h4'))
    .map((heading, index) => {
      const title = heading.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      if (!title) return null;

      return {
        id: `kd-heading-${index}`,
        level: Number(heading.tagName.slice(1)),
        title,
      };
    })
    .filter((item): item is KnowledgeOutlineItem => Boolean(item));
}
