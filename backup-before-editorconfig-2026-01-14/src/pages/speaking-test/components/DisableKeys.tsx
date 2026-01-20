import { useEffect } from "react";
import { toast } from "sonner";

const DisableKeys = () => {
    useEffect(() => {
        const detectDevTools = () => {
            const threshold = 160;
            if (
                window.outerWidth - window.innerWidth > threshold ||
                window.outerHeight - window.innerHeight > threshold
            ) {
                alert("DevTools aniqlanmoqda! Iltimos, uni yoping.");
                document.exitFullscreen?.();
                window.location.href = "/test";
            }
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "F11" || e.key === "Escape") {
                toast.error("Fullscreen rejimidan chiqish taqiqlangan");
            }

            if (e.key === "F12") {
                e.preventDefault();
                toast.error("Bu tugma sinov davomida ishlatilmaydi");
            }

            if (e.ctrlKey && e.shiftKey && e.key === "I") {
                e.preventDefault();
                toast.error("Bu tugma sinov davomida ishlatilmaydi");
            }

            if (e.ctrlKey && e.shiftKey && e.key === "J") {
                e.preventDefault();
                toast.error("Bu tugma sinov davomida ishlatilmaydi");
            }

            if (e.ctrlKey && e.key.toLowerCase() === "u") {
                e.preventDefault();
                toast.error("Bu tugma sinov davomida ishlatilmaydi");
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            toast.error("Right click sinov davomida taqiqlangan");
        };

        // 🔍 Boshlanishida tekshirish
        detectDevTools();

        // 🔄 Har 1 sekundda qayta tekshirish
        const interval = setInterval(detectDevTools, 1000);

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("contextmenu", handleContextMenu);

        return () => {
            clearInterval(interval);
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("contextmenu", handleContextMenu);

            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
        };
    }, []);

    return null;
};

export default DisableKeys;
