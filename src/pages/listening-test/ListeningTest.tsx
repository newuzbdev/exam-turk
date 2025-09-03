import { useParams, useNavigate } from "react-router-dom";
import ListeningTestDemo from "@/components/listening-test/ListeningTestDemo";

export default function ListeningTestPage() {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();

    if (!testId) {
        navigate("/test");
        return null;
    }

    return (
        <ListeningTestDemo
            testId={testId}
        />
    );
}