"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext({
    socket: null,
    isConnected: false,
});

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const socketInstance = io(undefined, {
            path: "/api/socket/io",
            addTrailingSlash: false,
            transports: ["polling", "websocket"],
            withCredentials: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
        });

        socketInstance.on("connect", () => {
            console.log("✅ Socket Connected:", socketInstance.id);
            setIsConnected(true);
        });

        socketInstance.on("disconnect", (reason) => {
            console.warn("⚠️ Socket Disconnected:", reason);
            setIsConnected(false);
        });

        socketInstance.on("connect_error", (err) => {
            console.error("❌ Socket Error:", err.message);
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
