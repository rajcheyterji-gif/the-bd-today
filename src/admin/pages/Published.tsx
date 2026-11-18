import { ArticleList } from "../components/ArticleList";

export function Published() {
  return (
    <ArticleList
      status="published"
      title="Published"
      subtitle="Live stories on the public site."
      showStatusFilter={false}
      emptyHint="Nothing published yet. Publish a draft to see it here."
    />
  );
}
