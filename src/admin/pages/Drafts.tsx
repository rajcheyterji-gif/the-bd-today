import { ArticleList } from "../components/ArticleList";

export function Drafts() {
  return (
    <ArticleList
      status="draft"
      title="Drafts"
      subtitle="Unfinished stories waiting to be published."
      showStatusFilter={false}
      emptyHint="No drafts. Start a new article and save it as a draft."
    />
  );
}
