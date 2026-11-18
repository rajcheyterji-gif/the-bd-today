import { ArticleList } from "../components/ArticleList";

export function Scheduled() {
  return (
    <ArticleList
      status="scheduled"
      title="Scheduled"
      subtitle="Stories queued to publish at a future time."
      showStatusFilter={false}
      emptyHint="Nothing scheduled. Set a future date in the article editor to schedule a story."
    />
  );
}
