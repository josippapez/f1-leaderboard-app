import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
// import Table from './table';

// import './App.css';

export interface User {
  id: number;
  // lapId: number;
  // time: number;
  // valid: boolean;
  // finished: boolean;
  // lastFrameIdentifier: number;
  name: string;
  hasRecord: boolean;
  selected: boolean;
}

function Admin() {
  const [socket, setSocket] = useState<Socket>();
  const [userIdUnderEdit, setUserIdUnderEdit] = useState<number>(0);
  const [users, setUsers] = useState<User[]>([]);
  const [input, setInput] = useState(''); // '' is the initial state value
  const [newUserName, setNewUserName] = useState(''); // '' is the initial state value
  // const [lapData, setLapData] = useState<Lap[]>([]);

  useEffect(() => {
    const newSocket = io(`http://${window.location.hostname}:3001`, {});
    // newSocket.on()
    setSocket(newSocket as unknown as any);
    // return () => newSocket.close();
  }, [setSocket]);

  useEffect(() => {
    const listOfUsersListener = (listOfUsers: User[]) => {
      setUsers(() => {
        // const newMessages = {...prevMessages};
        // delete newMessages[messageID];
        // console.log(users)
        return listOfUsers;
      });
    };

    // socket?.on('lapFinished', lapFinishedListener);
    socket?.on('listOfUsers', listOfUsersListener);
    socket?.on('connect', () => {
      // console.log("connect")
      socket.emit('getListOfUsers');
    });

    return () => {
      socket?.off('listOfUsers', listOfUsersListener);
      socket?.off('connect');
    };
  }, [socket]);

  const deleteUser = (id: number) => {
    const user = users.find((u) => u.id === id);
    if (!user?.hasRecord) {
      socket?.emit('deleteUser', id);
    }
  };

  const editName = (id: number) => {
    if (userIdUnderEdit) {
      return;
    }
    const user = users.find((u) => u.id === id) as User;

    setUserIdUnderEdit(id);
    setInput(user.name);
  };

  const updateName = (id: number) => {
    if (!userIdUnderEdit) {
      return;
    }
    socket?.emit('updateName', { id: userIdUnderEdit, name: input });
    setUserIdUnderEdit(0);
  };

  const setAsDriver = (id: number) => {
    // const user = users.find(u=> u.id === id);
    socket?.emit('setAsDriver', id);
  };

  const addUser = () => {
    // const user = users.find(u=> u.id === id);
    socket?.emit('addUser', { name: newUserName });
    setNewUserName('');
  };

  return (
    <div className="resultsarchive-wrapper adminfix">
      <NavLink to="/">Standings</NavLink>
      <div className="resultsarchive-content-header">
        <h1 className="ResultsArchiveTitle"> 2021 Driver Standings </h1>
      </div>
      <div className="resultsarchive-content">
        <div className="table-wrap">
          <table className="resultsarchive-table">
            <thead>
              <tr>
                <th role="button" aria-label="none" className="limiter" />
                <th>Driver</th>
                <th>Edit Name</th>
                <th>Delete</th>
                <th>Set as Driver</th>
                <th role="button" aria-label="none" className="limiter" />
              </tr>
            </thead>

            <tbody>
              {users
                .sort((a, b) => a.id - b.id)
                .map((message) => (
                  <tr key={message.id}>
                    <td className="limiter" />
                    <td>
                      {userIdUnderEdit === message.id ? (
                        <input
                          value={input}
                          onInput={(e) =>
                            setInput((e.target as HTMLInputElement).value)
                          }
                        />
                      ) : (
                        message.name
                      )}
                    </td>
                    <td>
                      {userIdUnderEdit === message.id ? (
                        <button
                          type="button"
                          className="blue"
                          onClick={() => updateName(message.id)}
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="blue"
                          onClick={() => editName(message.id)}
                        >
                          Edit
                        </button>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={message.hasRecord}
                        className="red"
                        onClick={() => deleteUser(message.id)}
                      >
                        Delete
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`setdriver ${
                          message.selected && 'selected'
                        }`}
                        onClick={() =>
                          !message.selected && setAsDriver(message.id)
                        }
                      >
                        {message.selected ? 'Driver' : 'Set As Driver'}
                      </button>
                    </td>
                    <td className="limiter" />
                  </tr>
                ))}
              <tr>
                <td className="limiter" />
                <td>
                  <input
                    value={newUserName}
                    onInput={(e) =>
                      setNewUserName((e.target as HTMLInputElement).value)
                    }
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="blue"
                    onClick={() => addUser()}
                  >
                    Add
                  </button>
                </td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td className="limiter" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Admin;
