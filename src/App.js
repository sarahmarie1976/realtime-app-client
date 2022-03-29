import { useState, useEffect } from 'react';
import socket from './socket';
import toast, { Toaster } from 'react-hot-toast';
import ScrollToBottom from 'react-scroll-to-bottom';
import { css } from '@emotion/css';

const ROOT_CSS = css({
    height: 650,
    width: "100%",
  });

function App() {
  // state
  const [username, setUsername] = useState('');
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  // PRIVATE CHAT   
  const [privateMessage, setPrivateMessage] = useState('');

  useEffect(() => {
    socket.on("user joined", (msg) => {
      console.log("user joined message", msg);
    });

    socket.on("message", (data) => {
      // console.log("message", message);
     
      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: data.id,
          name: data.name,
          message: data.message,
        },
      ]);
    });

    return () => {
      socket.off('user joined');
      socket.off('message');
    };
  }, []);

  useEffect(() => {
    socket.on('user connected' , user => {
      user.connected = true;
      user.messages = [];
      user.hasNewMessages = false;
      setUsers(prevUsers => [...prevUsers, user]);
      toast.success(`${user.username} Joined`);
    });

    socket.on("users", (users) => {
      // setUsers(users);
      users.forEach((user) => {
        user.self = user.userID === socket.id;
        user.connected = true;
        user.messages = [];
        user.hasNewMessages = false;
      });
      // PUT THE CURRENT USER FIRST, AND SORT BY USERNAME
      const sorted = users.sort((a, b) => {
        if (a.self) return -1;
        if (b.self) return 1;
        if (a.username < b.username) return -1;
        return a.username > b.username ? 1 : 0;
      });

      setUsers(sorted);
    });

    socket.on("username taken", () => {
        toast.error("Username taken");
    });

    return () => {
      socket.off('users');
      socket.off("user connected");
      socket.off("username taken");
    };
  }, [socket]);

  useEffect(() => {
    socket.on("user disconnected", (id) => {
      let allUsers = users;

      let index = allUsers.findIndex((el) => el.userID === id);
      let foundUser = allUsers[index];
      foundUser.connected = false;

      allUsers[index] = foundUser;
      setUsers([...allUsers]);
      // DISCONNECTED ALERT
      toast.error(`${foundUser.username} left the chat`)
    }); 

    return () => {
        socket.off("user disconnected");
    }
  }, [users, socket])

  const handleUsername = (e) => {
    e.preventDefault();
   
    socket.auth = { username };
    socket.connect();
    console.log(socket);

    setTimeout(() => {
      if (socket.connected){
        console.log('socket.connected', socket );
        setConnected(true);
      }
    }, 1000)
  };

  const handleMessage = (e) => {
    e.preventDefault();
    socket.emit('message', {
        id: Date.now(),  // would want to use a npm random id
        name: username,
        message,
    });
    setMessage("");
  };

  if(message) {
      socket.emit('typing', username);
  }

  useEffect(() => {
    socket.on('typing', (data) => {
        setTyping(data);
        setTimeout(() =>{
            setTyping('');
        }, 2000)
    });

    return () => {
        socket.off('typing');
    } 
  }, [])

  useEffect(() => {
    socket.on("private message", ({ message, from }) => {
      // console.log("message > ", message, "from > ", from);
      const allUsers = users;
      let index = allUsers.findIndex((u) => u.userID === from);
      let foundUser = allUsers[index];

      foundUser.messages.push({
        message,
        fromSelf: false,
      });

      if (foundUser) {
        if (selectedUser) {
          if (foundUser.userID !== selectedUser.userID) {
            foundUser.hasNewMessages = true;
          }
        } else {
          foundUser.hasNewMessages = true;
        }

        allUsers[index] = foundUser;
        setUsers([...allUsers]);
      }
    });
    
    return () => {
      socket.off('private message');
    }
  },[users]);

  const handleUsernameClick = (user) => {
    if (user.self || !user.connected) return;
    setSelectedUser({ ...user, hasNewMessages: false });

    let allUsers = users;
    let index = allUsers.findIndex((u) => u.userID === user.userID);
    let foundUser = allUsers[index];
    foundUser.hasNewMessages = false;

    allUsers[index] = foundUser;
    setUsers([...allUsers]);
  };

  const handlePrivateMessage = e => {
      e.preventDefault();
      if(selectedUser) {
          socket.emit('private message', {
            message: privateMessage,
            to: selectedUser.userID, 
          });

          let updated = selectedUser;
          updated.messages.push({
              message: privateMessage,
              fromSelf: true,
              hasNewMessages: false,
          });
          setSelectedUser(updated);
          setPrivateMessage('');
      }
  };

  return (
    <div className="container-fluid bg-light">
        <Toaster />
        <div className='row bg-info text-center'>
          <h1 className='fw-bold pt-2 text-white'>
            REALTIME CHAT APP
          </h1>
          <br />
          <p className='lead text-white'> Public and private chat </p>
          
        </div>
        <br />
      

        {!connected && (
            <div className='row'>
                <form onSubmit={handleUsername} className="text-center pt-3">
                    <div className="row g-3">
                        <div className="col-md-8">
                            <input
                              value={username}
                              onChange={e => setUsername(e.target.value)}
                              type='text'
                              placeholder='Enter your name'
                              className='form-control'
                            />
                        </div>

                        <div className='col-md-4'>
                            <button className='btn btn-info text-white text-bold' type='submit'>
                                Join
                            </button>
                        </div>
                    </div>
                </form> 
           </div>
        )}

<div className="row">
        <div className="col-md-2 pt-4">
          {connected &&
            users.map((user) => (
              <div
                key={user.userID}
                onClick={() => handleUsernameClick(user)}
                style={{
                  textDecoration:
                    selectedUser?.userID == user.userID && "underline green 3px",
                  cursor: !user.self && "pointer",
                }}
              >
                {user.username.charAt(0).toUpperCase() + user.username.slice(1)}{" "}
                {user.self && "(yourself)"}{" "}
                {user.connected ? (
                  <span className="online-dot"></span>
                ) : (
                  <span className="offline-dot"></span>
                )}
                {user.hasNewMessages && <b className="text-danger">+ </b>}
                {user.hasNewMessages && (
                  <b className="text-danger">
                    {user.hasNewMessages && user.messages.length}
                  </b>
                )}
              </div>
            ))}
        </div>

        {connected && (
          <div className="col-md-5">
            <form onSubmit={handleMessage} className="text-center pt-3">
              <div className="row g-3">
                <div className="col-9">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    type="text"
                    placeholder="Type Your Message (Public)"
                    className="form-control"
                  />
                </div>

                <div className="col-2 ">
                  <button className="btn btn-info text-white " type="submit">
                    Send
                  </button>
                </div>
              </div>
            </form>

            <br />

            <div className="col">
              <ScrollToBottom className={ROOT_CSS}>
                {messages.map((m) => (
                  <div className="alert alert-secondary" key={m.id}>
                    {m.name.charAt(0).toUpperCase() + m.name.slice(1)} -{" "}
                    {m.message}
                  </div>
                ))}
              </ScrollToBottom>
              <br />
              {typing && typing}
            </div>
          </div>
        )}

        <br />

        {selectedUser && (
          <div className="col-md-5">
            <form onSubmit={handlePrivateMessage} className="text-center pt-3">
              <div className="row g-3">
                <div className="col-9">
                  <input
                    value={privateMessage}
                    onChange={(e) => setPrivateMessage(e.target.value)}
                    type="text"
                    placeholder="Type Your Message (Private)"
                    className="form-control"
                  />
                </div>

                <div className="col-2">
                  <button className="btn btn-info text-white" type="submit">
                    Send
                  </button>
                </div>
              </div>
            </form>

            <br />

            <div className="col">
              <ScrollToBottom className={ROOT_CSS}>
                {selectedUser &&
                  selectedUser.messages &&
                  selectedUser.messages.map((msg, index) => (
                    <div key={index} className="alert alert-secondary">
                      {msg.fromSelf
                        ? "(yourself)"
                        : selectedUser.username.charAt(0).toUpperCase() +
                          selectedUser.username.slice(1)}{" "}
                      {" - "}
                      {msg.message}
                    </div>
                  ))}
              </ScrollToBottom>
              <br />
              {typing && typing}
            </div>
          </div>
        )}

        <br />
      </div>  

    </div>
  );
}

export default App;
 