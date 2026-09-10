import { GroupLobbyPageClient } from "@/features/group/group-lobby-page-client";

type GroupLobbyPageProps = Readonly<{
  params: Promise<{ sessionId: string }>;
}>;

export default async function GroupLobbyPage({ params }: GroupLobbyPageProps) {
  const { sessionId } = await params;
  return <GroupLobbyPageClient sessionId={sessionId} />;
}
