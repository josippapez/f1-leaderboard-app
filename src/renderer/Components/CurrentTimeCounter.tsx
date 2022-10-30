import { useEffect } from 'react';
import { Socket } from 'socket.io-client';

type Props = { socket: Socket };

const CurrentTimeCounter = (props: Props) => {
  const { socket } = props;

  useEffect(() => {
    socket?.on('timer', (html: string) => {
      const element = document.getElementById('timer');
      if (element) {
        element.innerHTML = html;
      }
    });

    return () => {
      socket?.off('timer');
    };
  }, [socket]);

  return (
    <>
      {/*  <div className="current-time-counter">{currentTime.time}</div> */}
      <div id="timer" />
    </>
  );
};

export default CurrentTimeCounter;
