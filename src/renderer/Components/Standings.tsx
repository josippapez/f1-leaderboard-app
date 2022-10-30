import { createAvatar } from '@dicebear/avatars';
import * as style from '@dicebear/avatars-gridy-sprites';
import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import CurrentTimeCounter from './CurrentTimeCounter';

// import Table from './table';

// import './App.css';

export interface Standing {
  id: number;
  // lapId: number;
  time: number;
  sector1Time: string;
  sector2Time: string;
  sector3Time: string;
  sector1TimeMs: number;
  sector2TimeMs: number;
  sector3TimeMs: number;
  sector1CurrentTime: string;
  sector2CurrentTime: string;
  sector3CurrentTime: string;
  // valid: boolean;
  // finished: boolean;
  // lastFrameIdentifier: number;
  pos: string;
  avatarSeed: string;
  name: string;
  team: string;
  diff: string;
}

function Standings() {
  const [socket, setSocket] = useState<Socket>();
  const [lapData, setLapData] = useState<Standing[]>([]);
  const bestSectors: {
    current: {
      sector1: number;
      sector2: number;
      sector3: number;
    };
  } = useRef({
    sector1: 100000000,
    sector2: 100000000,
    sector3: 100000000,
  });

  // find lowest sector1Time, sector2Time, sector3Time from lapData and save them to bestSectors
  const findBestSectors = (standings: Standing[]) => {
    let bestSector1 = bestSectors.current.sector1;
    let bestSector2 = bestSectors.current.sector2;
    let bestSector3 = bestSectors.current.sector3;
    for (const lap of standings) {
      if (lap.sector1TimeMs && lap.sector2TimeMs && lap.sector3TimeMs) {
        if (lap.sector1TimeMs < bestSector1) {
          bestSector1 = lap.sector1TimeMs;
        }
        if (lap.sector2TimeMs < bestSector2) {
          bestSector2 = lap.sector2TimeMs;
        }
        if (lap.sector3TimeMs < bestSector3) {
          bestSector3 = lap.sector3TimeMs;
        }
      }
    }

    bestSectors.current = {
      sector1: bestSector1,
      sector2: bestSector2,
      sector3: bestSector3,
    };
  };

  useEffect(() => {
    const newSocket = io(`http://${window.location.hostname}:3001`, {});
    // newSocket.on()
    setSocket(newSocket as unknown as any);
    // return () => newSocket.close();
  }, [setSocket]);

  useEffect(() => {
    const lapFinishedListener = (lap: Standing) => {
      socket?.emit('getLapData');
      // setLapData([...lapData, lap])
      // setLapData((laps: Lap[]) => {

      //   // console.log({prevMessages, lapData})
      //   const newMessages = [...laps, lap];
      //   // newMessages[message.id] = message;
      //   return newMessages;
      // });
    };

    const lapDataListener = (standings: Standing[]) => {
      findBestSectors(standings);
      setLapData(standings);
    };
    socket?.on('lapFinished', lapFinishedListener);
    socket?.on('lapData', lapDataListener);
    socket?.on('connect', () => {
      console.log('connect');
      findBestSectors(lapData);
      socket?.emit('getLapData');
    });

    return () => {
      socket?.off('lapFinished', lapFinishedListener);
      socket?.off('lapData', lapDataListener);
      socket?.off('connect');
    };
  }, [socket]);

  return (
    <div className="App">
      {socket ? (
        <div className="chat-container">
          <div className="resultsarchive-wrapper">
            <div className="resultsarchive-content-header">
              <NavLink to="admin">Admin</NavLink>
              <div className="top-bar">
                <h1 className="ResultsArchiveTitle">Šoferi</h1>
                <CurrentTimeCounter socket={socket} />
              </div>
              <button
                type="button"
                onClick={() => {
                  socket?.emit('removeLaps');
                }}
              >
                Obriši podatke
              </button>
            </div>
            <div className="resultsarchive-content">
              <div className="table-wrap">
                <table className="resultsarchive-table">
                  <thead>
                    <tr>
                      <th role="button" aria-label="none" className="limiter" />
                      <th>
                        <abbr title="Position">Pos</abbr>
                      </th>
                      <th>Icon</th>
                      <th>Driver</th>
                      <th>
                        <abbr title="Points">Sector 1</abbr>
                      </th>
                      <th>
                        <abbr title="Points">Sector 2</abbr>
                      </th>
                      <th>
                        <abbr title="Points">Sector 3</abbr>
                      </th>
                      <th>
                        <abbr title="Points">Time</abbr>
                      </th>
                      <th>Diff</th>
                      <th role="button" aria-label="none" className="limiter" />
                    </tr>
                  </thead>

                  <tbody>
                    {lapData
                      .sort((a, b) => a.id - b.id)
                      .map((message) => (
                        <tr key={message.id}>
                          <td className="limiter" />
                          <td className="dark">{message.pos}</td>
                          <td>
                            <div
                              className="logo"
                              dangerouslySetInnerHTML={{
                                __html: createAvatar(style, {
                                  seed: message.avatarSeed,
                                  // width: 6
                                  // scale: 80
                                  // ... and other options
                                }),
                              }}
                            />
                          </td>
                          <td>
                            <span>{message.name}</span>
                          </td>
                          <td
                            className="dark bold"
                            style={{
                              backgroundColor:
                                bestSectors.current.sector1 &&
                                message.sector1Time !== '-' &&
                                bestSectors.current.sector1 ===
                                  message.sector1TimeMs
                                  ? '#8b04de'
                                  : 'transparent',
                            }}
                          >
                            {message.sector1Time}
                            <br />
                            <small>{message?.sector1CurrentTime}</small>
                          </td>
                          <td
                            className="dark bold"
                            style={{
                              backgroundColor:
                                bestSectors.current.sector2 &&
                                message.sector2Time !== '-' &&
                                bestSectors.current.sector2 ===
                                  message.sector2TimeMs
                                  ? '#8b04de'
                                  : 'transparent',
                            }}
                          >
                            {message.sector2Time}
                            <br />
                            <small>{message?.sector2CurrentTime}</small>
                          </td>
                          <td
                            className="dark bold"
                            style={{
                              backgroundColor:
                                bestSectors.current.sector3 &&
                                message.sector3Time !== '-' &&
                                bestSectors.current.sector3 ===
                                  message.sector3TimeMs
                                  ? '#8b04de'
                                  : 'transparent',
                            }}
                          >
                            {message.sector3Time}
                            <br />
                            <small>{message?.sector3CurrentTime}</small>
                          </td>
                          <td className="dark bold">{message.time}</td>
                          <td className="dark bold">{message.diff}</td>
                          <td className="limiter" />
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>Not Connected</div>
      )}
    </div>
  );
}

export default Standings;
