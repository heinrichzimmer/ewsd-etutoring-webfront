import ChatRoom from "@/components/chat/chat-room";

export default function StudentMessagesPage() {
    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-semibold">Messages</h1>
            <ChatRoom isTutor={false} />
        </div>
    );
}