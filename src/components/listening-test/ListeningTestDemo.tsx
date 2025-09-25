import { Volume2, VolumeX } from "lucide-react";

import { Button } from "../ui/button";
import ListeningPart1 from "./ui/ListeningPart1";
import ListeningPart2 from "./ui/ListeningPart2";
import ListeningPart3 from "./ui/ListeningPart3";
import ListeningPart4 from "./ui/ListeningPart4";
import ListeningPart5 from "./ui/ListeningPart5";
import ListeningPart6 from "./ui/ListeningPart6";
import {  useState } from "react";

export default function ListeningTestPage({ testId }: { testId: string }) {
  const [audioEnabled, setAudioEnabled] = useState(true);

  return (
    <div className="mx-auto flex flex-col mx-auto min-h-screen">
      <div className="bg-white border-b-2 border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="bg-red-600 text-white px-3 py-1 rounded font-bold text-lg">
          TURKISHMOCK
        </div>
        <div className="font-bold text-2xl">DINLEME</div>
        <div className="flex items-center gap-4">
          <div className="font-bold text-lg">10:00</div>
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-1"
          >
            {audioEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <Button className="bg-red-600 hover:bg-red-700 text-white px-4 py-1 text-sm font-bold">
            GÖNDER
          </Button>
        </div>
      </div>

      <ListeningPart1 />
      <ListeningPart2 />
      <ListeningPart3 />
      <ListeningPart4 />
      <ListeningPart5 />
      <ListeningPart6 />
    </div>
  );
}
