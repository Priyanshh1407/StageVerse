"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext({
    socket: null,
    isConnected: false,
});

export const useSocket = () => {
    return useContext(SocketContext);
};

/**
 * Join the realtime room for one show. The server checks the session cookie and
 * decides the role ('artist' | 'crew' | 'organizer' | 'audience'); a socket only
 * receives events for rooms it has joined. Re-joins after every reconnect, because
 * a reconnected socket starts with no rooms. Joining a room is what opens the connection
 * (the provider doesn't connect on its own, so public pages never open a socket).
 */
export function useShowRoom(eventId) {
    const { socket } = useSocket();
    const [room, setRoom] = useState({ joined: false, role: null, error: null });

    useEffect(() => {
        if (!socket || !eventId) return;
        let cancelled = false;

        const join = () => {
            socket.emit("show:join", String(eventId), (res) => {
                if (cancelled) return;
                setRoom(res?.ok
                    ? { joined: true, role: res.role, error: null }
                    : { joined: false, role: null, error: res?.error || "Could not join show" });
            });
        };

        if (socket.connected) join();
        else socket.connect();
        socket.on("connect", join);
        return () => {
            cancelled = true;
            socket.off("connect", join);
            socket.emit("show:leave", String(eventId));
        };
    }, [socket, eventId]);

    return room;
}

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
            autoConnect: false, // connected by useShowRoom, only on pages that use live features
        });

        socketInstance.on("connect", () => setIsConnected(true));
        socketInstance.on("disconnect", () => setIsConnected(false));
        socketInstance.on("connect_error", (err) => {
            // "unauthorized" means no valid session: the server refuses anonymous sockets
            console.warn("Socket connection error:", err.message);
        });

        // The socket is an external connection created once on mount, so storing it here is intended
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
