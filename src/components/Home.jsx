import React, { useEffect, useState, useRef } from "react";
import { socket } from "../socket/socket";
import { useAuth } from "../contexts/authContext";
import { addMessage, fetchMessages, fetchRooms } from "../services/chatService";
import { Dropzone } from "@mantine/dropzone";
import { Button, Group } from "@mantine/core";

export default function Home() {
  const { user } = useAuth();

  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [chatRoomMessages, setChatRoomMessages] = useState([]);

  const openRef = useRef(null);
  const msg = useRef(null);

  useEffect(() => {
    const fetchRoomsData = async () => {
      try {
        const data = await fetchRooms();
        setRooms(data);
      } catch (error) {
        console.log(error);
      }
    };

    fetchRoomsData();
  }, []);

  useEffect(() => {
    function onMessageReceived({ roomId, message, sender }) {
      setChatRoomMessages((msg) => [...msg, { roomId, message, sender }]);
    }

    socket.on("messageReceived", onMessageReceived);

    return () => {
      socket.off("messageReceived");
    };
  }, []);

  useEffect(() => {
    const fetchMessagesData = async () => {
      try {
        if (activeRoom) {
          const data = await fetchMessages(activeRoom.id);
          setChatRoomMessages(data);
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchMessagesData();
  }, [activeRoom]);

  function sendMessage(message, type) {
    if (socket === null) return null;

    socket.emit("sendMessage", {
      roomId: activeRoom.id,
      message: message,
      sender: user.name,
      type,
    });

    addMsgToDB(message, type);
  }

  function setRoom(roomId) {
    setActiveRoom(rooms.filter((room) => room.id === roomId)[0]);

    socket.emit("join", roomId);
  }

  async function addMsgToDB(message, type) {
    try {
      if (activeRoom) {
        await addMessage(activeRoom.id, user._id, message, type);
      }
    } catch (error) {
      console.log(error);
    }
  }

  async function uploadAudio(file) {
    try {
      if (!file[0]) {
        throw new Error("Please select a file.");
      }

      const formData = new FormData();
      formData.append("file", file[0]);
      formData.append("upload_preset", "webchatAudio");

      const response = await fetch(
        "https://api.cloudinary.com/v1_1/sayuk/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to upload file. Status: ${response.status}`);
      }

      const data = await response.json();
      const { secure_url: audioUrl } = data;
      let type = "audio";

      audioUrl && sendMessage(audioUrl, type);
      console.log(audioUrl);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className=" h-screen overflow-hidden grid grid-cols-12">
      <aside className="col-span-3 py-4 overflow-y-auto">
        {rooms.map((room) => (
          <div
            className={
              "p-2 hover:bg-blue-600 cursor-pointer " +
              (activeRoom?.id === room.id ? "bg-blue-600" : "")
            }
            key={room.id}
            onClick={() => {
              setRoom(room.id);
            }}
          >
            <div>{room.title}</div>
          </div>
        ))}
      </aside>

      <div className="col-span-9 p-4 overflow-y-auto flex flex-col">
        <div className="flex-grow overflow-y-auto">
          {chatRoomMessages &&
            chatRoomMessages?.map((message) => (
              <div key={message.id} className="mb-4">
                <div className="font-bold">{message.sender}</div>
                <div>{message.message}</div>
              </div>
            ))}
        </div>

        <div className="flex items-center space-x-4 bg-slate-900 p-4">
          <div>
            <Dropzone
              openRef={openRef}
              onDrop={uploadAudio}
              activateOnClick={false}
              accept={["audio/mpeg"]}
            >
              <Group justify="center">
                <Button
                  onClick={() => openRef.current?.()}
                  style={{ pointerEvents: "all" }}
                >
                  M
                </Button>
              </Group>
            </Dropzone>
          </div>

          <div>
            <Dropzone
              openRef={openRef}
              onDrop={() => {}}
              activateOnClick={false}
              accept={["video/mp4"]}
            >
              <Group justify="center">
                <Button
                  onClick={() => openRef.current?.()}
                  style={{ pointerEvents: "all" }}
                >
                  V
                </Button>
              </Group>
            </Dropzone>
          </div>
          <input
            ref={msg}
            type="text"
            className="p-2 border border-gray-300 rounded flex-grow"
          />

          <button
            onClick={() => {
              sendMessage(msg.current.value, "text");
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
