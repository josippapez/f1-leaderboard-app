import Store from 'electron-store';
import { constants, F1TelemetryClient } from '@racehub-io/f1-telemetry-client';
import dayjs from 'dayjs';
// or: const { F1TelemetryClient, constants } = require('f1-telemetry-client');

// const TEAMS = {
//   0: "Mercedes",
//   1: "Ferrari",
//   2: "Red Bull Racing",
//   3: "Wiliams",
//   4: "Aston Martin",
//   5: "Alpine",
//   6: "Alpha Tauri",
//   7: "Haas",
//   8: "McLaren",
//   9: "Alfa Romeo"
// }

// const TRACKS = {
//   0: "Melbourne",
//   1: "Paul Ricard",
//   2: "Shanghai",
//   3: "Sakhir (Bahrain)",
//   4: "Catalunya",
//   5: "Monaco",
//   6: "Montreal",
//   7: "Silverstone",
//   8: "Hockenheim",
//   9: "Hungaroring",
//   10: "Spa",
//   11: "Monza",
//   12: "Singapore",
//   13: "Suzuka",
//   14: "Abu Dhabi",
//   15: "Texas",
//   16: "Brazil",
//   17: "Austria",
//   18: "Sochi",
//   19: "Mexico",
//   20: "Baku (Azerbaijan)",
//   21: "Sakhir Short",
//   22: "Silverstone Short",
//   23: "Texas Short",
//   24: "Suzuka Short",
//   25: "Hanoi",
//   26: "Zandvoort",
//   27: "Imola",
//   28: "Portimão",
//   29: "Jeddah",
// }

import { Server } from 'socket.io';

const server = require('http').createServer();

const store = new Store();

const io = new Server(server, {
  cors: {
    origin: `http://localhost:${process.env.PORT || 1212}`,
    methods: ['GET', 'POST'],
  },
});

const { PACKETS } = constants;

const client = new F1TelemetryClient({
  port: 20777,
  bigintEnabled: false,
  skipParsing: true,
});

function loadUsers() {
  return store.get('users', []) as User[];
}

function loadLaps() {
  return store.get('laps', []) as LapResult[];
}

console.log(store.get('users', []), store.get('laps', []));

let laps: LapResult[] = loadLaps();
let users: User[] = loadUsers();

function saveLaps() {
  store.set('laps', laps);
}

function saveUsers() {
  store.set('users', users);
}

// and when you want to stop:
// client.stop();

function listOfUsersFormatted() {
  return users
    .filter((u) => !u.softDeleted)
    .map((u) => ({
      ...u,
      hasRecord: !!laps.find(
        (l) => l.valid && l.finished && l.driverId === u.id
      ),
    }));
}

// let currentTeam = "";
// let currentTrack = "";
const generateStandings = (): {
  name: string;
  time: string;
  timeMs: number;
  sector1Time: string;
  sector1TimeMs: number;
  sector2Time: string;
  sector2TimeMs: number;
  sector3Time: string;
  sector3TimeMs: number;
  sector1CurrentTime: string;
  sector2CurrentTime: string;
  sector3CurrentTime: string;
  team: string;
  diff: string;
  softDeleted: boolean;
  pos: string;
}[] => {
  const results = users.reduce(
    (acc, user) => ({
      ...acc,
      [user.id]: {
        name: user.name,
        softDeleted: user.softDeleted,
        avatarSeed: user.avatarSeed,
        time: null,
        timeMs: null,
        sector1Time: null,
        sector1TimeMs: null,
        sector2Time: null,
        sector2TimeMs: null,
        sector3Time: null,
        sector3TimeMs: null,
        sector1CurrentTime: null,
        sector2CurrentTime: null,
        sector3CurrentTime: null,
        team: '-',
        diff: null,
        pos: '-',
      },
    }),
    {} as {
      [K: string]: {
        name: string;
        time: string;
        timeMs: number;
        sector1Time: string;
        sector1TimeMs: number;
        sector2Time: string;
        sector2TimeMs: number;
        sector3Time: string;
        sector3TimeMs: number;
        sector1CurrentTime: string;
        sector2CurrentTime: string;
        sector3CurrentTime: string;
        team: string;
        diff: string;
        softDeleted: boolean;
        pos: string;
      };
    }
  );

  let fastestTime = 100000000;
  let fastestSector1 = 100000000;
  let fastestSector2 = 100000000;
  let fastestSector3 = 100000000;

  for (const lap of laps) {
    const sector3Time = lap.time - lap.sector1Time - lap.sector2Time;
    lap.sector3Time = sector3Time;
    if (!lap.finished) {
      continue;
    }
    if (!lap.valid) {
      continue;
    }

    if (!lap.driverId) {
      continue;
    }
    // console.log({users, lap})
    const user = users.find((u) => u.id === lap.driverId);
    if (user?.softDeleted) {
      continue;
    }

    if (lap.time < (results[lap.driverId].timeMs ?? 100000000)) {
      results[lap.driverId].timeMs = lap.time;
      // results[lap.driverId].team = lap.team
      if (lap.time < fastestTime) {
        fastestTime = lap.time;
      }
    }

    if (lap.sector1Time < (results[lap.driverId].sector1TimeMs ?? 100000000)) {
      results[lap.driverId].sector1TimeMs = lap.sector1Time;
      if (lap.sector1Time < fastestSector1) {
        fastestSector1 = lap.sector1Time;
      }
    }

    if (lap.sector2Time < (results[lap.driverId].sector2TimeMs ?? 100000000)) {
      results[lap.driverId].sector2TimeMs = lap.sector2Time;
      if (lap.sector2Time < fastestSector2) {
        fastestSector2 = lap.sector2Time;
      }
    }

    if (lap.sector3Time < (results[lap.driverId].sector3TimeMs ?? 100000000)) {
      results[lap.driverId].sector3TimeMs = lap.sector3Time;
      if (lap.sector3Time < fastestSector3) {
        fastestSector3 = lap.sector3Time;
      }
    }
  }

  for (const driverId of Object.keys(results)) {
    if (results[driverId].timeMs) {
      results[driverId].time = dayjs(results[driverId].timeMs).format(
        'm:ss.SSS'
      );
    } else {
      results[driverId].time = '-';
    }

    if (results[driverId].sector1TimeMs) {
      results[driverId].sector1Time = dayjs(
        results[driverId].sector1TimeMs
      ).format('m:ss.SSS');
    } else {
      results[driverId].sector1Time = '-';
    }

    if (results[driverId].sector2TimeMs) {
      results[driverId].sector2Time = dayjs(
        results[driverId].sector2TimeMs
      ).format('m:ss.SSS');
    } else {
      results[driverId].sector2Time = '-';
    }

    if (results[driverId].sector3TimeMs) {
      results[driverId].sector3Time = dayjs(
        results[driverId].sector3TimeMs
      ).format('m:ss.SSS');
    } else {
      results[driverId].sector3Time = '-';
    }

    if (results[driverId].timeMs > fastestTime) {
      const diff = results[driverId].timeMs - fastestTime;
      results[driverId].diff =
        diff < 60 * 1000
          ? `+${dayjs(diff).format('s.SSS')}`
          : `+${dayjs(diff).format('m:ss.SSS')}`;
    }
  }
  // console.log("generateStandings", Object.values(results).sort((a, b) => (a.timeMs || 100000000) - (b.timeMs || 100000000)))
  const standings = Object.values(results)
    .filter((u) => !u.softDeleted)
    .sort((a, b) => (a.timeMs || 100000000) - (b.timeMs || 100000000));

  let pos = 1;

  for (let index = 0; index < standings.length; index++) {
    const element = standings[index];

    if (!element.timeMs) {
      element.pos = '-';
      continue;
    }

    if (index === 0) {
      element.pos = pos.toString();
      // pos++;
      continue;
    }
    if (element.timeMs === standings[index - 1].timeMs) {
      element.pos = pos.toString();
    } else {
      pos++;
      element.pos = pos.toString();
    }
  }
  return standings;
};

function removeUsers() {
  if (store.get('users', null)) {
    store.set('users', null);
    users = [];
    store.get('users');
  }
}
function removeLaps() {
  if (store.get('laps', null)) {
    store.set('laps', []);
    laps = [];
    store.get('laps');
  }
}

const sockets = [];
io.on('connection', (socket) => {
  socket.on('getLapData', () => {
    console.log('getlapData');
    socket.emit('lapData', generateStandings());
  });

  socket.on('getListOfUsers', () => {
    console.log('getListOfUsers');
    socket.emit('listOfUsers', listOfUsersFormatted());
  });

  socket.on('setAsDriver', (driverId: number) => {
    console.log('setAsDriver');
    users.forEach((user) => {
      user.selected = user.id === driverId;
    });

    io.sockets.emit('listOfUsers', listOfUsersFormatted());
  });

  socket.on('updateName', ({ id, name }) => {
    console.log('updateName');

    users.forEach((user) => {
      if (user.id === id) {
        user.name = name;
      }
    });

    const standings = generateStandings();
    io.sockets.emit('listOfUsers', listOfUsersFormatted());
    io.sockets.emit('lapData', standings);
  });

  socket.on('addUser', ({ name }) => {
    console.log('addUser');
    users.push({
      id: Date.now(),
      name,
      // hasRecord: false,
      selected: false,
      softDeleted: false,
      avatarSeed: name, // `${name}${Math.round(Math.random() * 1000000)}`
    });
    store.set('users', users);

    const standings = generateStandings();

    io.sockets.emit('listOfUsers', listOfUsersFormatted());
    io.sockets.emit('lapData', standings);
  });

  socket.on('deleteUser', (id) => {
    console.log('deleteUser');
    const index = users.findIndex((u) => u.id === id);
    const hasRecord = laps.find(
      (l) => l.valid && l.finished && l.driverId === id
    );
    if (hasRecord) {
      return;
    }
    users[index].softDeleted = true;
    // users.splice(index, 1);
    const standings = generateStandings();
    // sockets.forEach(s => {
    io.sockets.emit('listOfUsers', listOfUsersFormatted());
    io.sockets.emit('lapData', standings);
    // })
  });

  socket.on('removeLaps', () => {
    console.log('removing Laps');
    removeLaps();
  });

  socket.on('removeUsers', () => {
    const standings = generateStandings();
    io.sockets.emit('lapData', standings);
    console.log('removing Users');
    removeUsers();
  });

  // socket.emit("lapData", laps)
  // new Connection(io, socket);
  sockets.push(socket);
});
// sockets.forEach(socket =>     socket.emit("lapData", [])
// )
// const resultsNamespace = io.of("/results");

interface Lap {
  id: number;
  time: number;
  name: string;
  team: string;
  diff: string;
}

interface LapResult {
  id: number;
  lapId: number;
  time: number;
  sector1Time: number;
  sector2Time: number;
  sector3Time?: number;
  // team?: string;
  valid: boolean;
  finished: boolean;
  lastFrameIdentifier: number;
  driverId?: number;
}

export interface User {
  id: number;
  // lapId: number;
  // time: number;
  // valid: boolean;
  // finished: boolean;
  // lastFrameIdentifier: number;
  name: string;
  avatarSeed: string;
  // hasRecord: boolean;
  selected: boolean;
  softDeleted: boolean;
}

// io.emit("lapData", laps)
function exitHandler(options: any, exitCode: any) {
  saveLaps();
  saveUsers();
  if (options.cleanup) console.log('clean');
  if (exitCode || exitCode === 0) console.log(exitCode);
  if (options.exit) process.exit();
}

// do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

// catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));
// var stream = createWriteStream("append.txt", {flags:'a'});
// client.on(PACKETS.event, console.log);
// client.on(PACKETS.motion, function(...args) {
//   console.log("MOTION", ...args);
// });
// client.on(PACKETS.carSetups, console.log);
// client.on(PACKETS.lapData, console.log);

// client.on(PACKETS.participants, function(event) {
//   currentTeam = TEAMS[event?.m_participants?.find(p => p.m_networkId === 0)?.m_teamId]
// });
// client.on(PACKETS.session, function(event) {
//   currentTrack = TRACKS[event?.m_trackId];
// });

// client.on(PACKETS.carTelemetry, console.log);
// client.on(PACKETS.carStatus, console.log);
// client.on(PACKETS.finalClassification, console.log);
// client.on(PACKETS.lobbyInfo, console.log);
// client.on(PACKETS.carDamage, console.log);
// client.on(PACKETS.sessionHistory, console.log);

let lastFrameIdentifier =
  laps[laps.length - 1]?.lastFrameIdentifier || 1000000000000;

function log(what: string, name: string) {
  client.on(what, function (event) {
    const data = event?.m_lapData?.[0];
    const lapNumber = data?.m_currentLapNum;
    const lapValid = data?.m_currentLapInvalid === 0;
    const time = data?.m_currentLapTime;
    const previousLapTime = data?.m_lastLapTime;
    const currentFrameIdentifier = event?.m_header?.m_frameIdentifier;
    const sector1Time = data?.m_sector1TimeInMS;
    const sector2Time = data?.m_sector2TimeInMS;
    /* if (sector1Time && sector2Time) {
      io.sockets.emit("lapTime", {
        lapValid,
        time: moment(time * 1000).format("m:ss.SSS"),
        sector1Time: moment(sector1Time).format("m:ss.SSS"),
        sector2Time: moment(sector2Time).format("m:ss.SSS"),
        sector3Time: moment(time * 1000 - (sector1Time + sector2Time)).format(
          "m:ss.SSS"
        ),
        lapNumber,
        name,
        previousLapTime,
        currentFrameIdentifier,
      });
    } else if (sector1Time) {
      io.sockets.emit("lapTime", {
        lapValid,
        time: moment(time * 1000).format("m:ss.SSS"),
        sector1Time: moment(sector1Time).format("m:ss.SSS"),
        lapNumber,
        name,
        previousLapTime,
        currentFrameIdentifier,
      });
    } else {
      io.sockets.emit("lapTime", {
        lapValid,
        time: moment(time * 1000).format("m:ss.SSS"),
        lapNumber,
        name,
        previousLapTime,
        currentFrameIdentifier,
      });
    } */

    io.sockets.emit(
      'timer',
      `
      <div class='current-time-counter'>${dayjs(time * 1000).format(
        'm:ss.SSS'
      )}</div>
      <div class='current-time-counter'>S1: ${dayjs(sector1Time).format(
        'm:ss.SSS'
      )}</div>
      <div class='current-time-counter'>S2: ${dayjs(sector2Time).format(
        'm:ss.SSS'
      )}</div>
      <div class='current-time-counter'>S3: ${
        sector1Time && sector2Time
          ? dayjs(time * 1000 - (sector1Time + sector2Time)).format('m:ss.SSS')
          : '0:00.000'
      }</div>
      `
    );

    // let currentLap: Lap = null;

    if (currentFrameIdentifier < lastFrameIdentifier) {
      // new session, add new lap

      const currentLap: LapResult = {
        id: laps.length,
        lapId: lapNumber,
        time: time * 1000,
        sector1Time,
        sector2Time,
        valid: lapValid,
        finished: false,
        lastFrameIdentifier: currentFrameIdentifier,
      };
      laps.push(currentLap);
      const previousLap = laps[laps.length - 2];
      if (previousLap) {
        previousLap.finished = true;
        previousLap.valid = false;
      }
    } else {
      const lastLap: LapResult = laps[laps.length - 1];

      if (lastLap && lastLap.lapId === lapNumber) {
        lastLap.time = time * 1000;
        lastLap.sector1Time = sector1Time;
        lastLap.sector2Time = sector2Time;
        lastLap.valid = lapValid;
        lastLap.lastFrameIdentifier = currentFrameIdentifier;
      } else {
        const currentLap: LapResult = {
          id: laps.length,
          lapId: lapNumber,
          time: time * 1000,
          sector1Time,
          sector2Time,
          valid: lapValid,
          finished: false,
          lastFrameIdentifier: currentFrameIdentifier,
        };
        laps.push(currentLap);
      }
      const previousLap = laps[laps.length - 2];

      if (previousLap && !previousLap.finished) {
        previousLap.finished = true;

        if (previousLap.valid) {
          previousLap.time = previousLapTime * 1000;
          const user = users.find((u) => u.selected);
          if (user) {
            previousLap.driverId = user.id;
          }
          // user.hasRecord = true;

          // previousLap.team = currentTeam;
          // console.log({previousLap})

          io.sockets.emit('lapFinished', previousLap);
          io.sockets.emit('listOfUsers', listOfUsersFormatted());
          saveLaps();
        }
      }
    }

    lastFrameIdentifier = currentFrameIdentifier;

    // console.log(laps);
    // stream.write(JSON.stringify({m_header: event.m_header, m_lapData: data}, null, 2) + "\n")
  });
}

// log(PACKETS.carTelemetry, "CAR_TELEMATRY");
// log(PACKETS.session, "SESSION");

let interval: null | ReturnType<typeof setInterval> = null;

function start() {
  log(PACKETS.lapData, 'LAP_DATA');
  interval = setInterval(() => {
    saveLaps();
    saveUsers();
  }, 5 * 1000);
  io.listen(3325);
  client.start();
}
function stop() {
  if (interval) {
    clearInterval(interval);
  }
  io.close();
  client.stop();
}

export { start, stop, io, client, listOfUsersFormatted };
