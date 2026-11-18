import { ArticleList } from "../components/ArticleList";

export function Articles() {
  return (
    <ArticleList
      title="Articles"
      subtitle="All stories — search, filter, publish, edit or delete."
      emptyHint="No articles match these filters. Try clearing the search or write a new story."
    />
  );
}
