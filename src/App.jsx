import React, { useState, useEffect } from "react";
import { Container, Row, Col, Card, Form, Button } from "react-bootstrap";
import {
  NavBar,
  ChatCard,
  Message,
  AddNewChat,
} from "./components/Components.js";
import { ethers } from "ethers";
import { abi } from "./abi";

const CONTRACT_ADDRESS = "0x7E9785425cdF8E4D8a212E9D844B7FE8fa42A837"; // Ensure this matches your Ganache contract

export function App(props) {
  const [friends, setFriends] = useState([]);
  const [myName, setMyName] = useState(null);
  const [myPublicKey, setMyPublicKey] = useState(null);
  const [activeChat, setActiveChat] = useState({
    friendname: null,
    publicKey: null,
  });
  const [activeChatMessages, setActiveChatMessages] = useState(null);
  const [showConnectButton, setShowConnectButton] = useState("block");
  const [myContract, setMyContract] = useState(null);

  // Save the contents of abi in a variable
  const contractABI = abi;

  // Connect to Ganache
  async function connectToGanache() {
    try {
      // Ganache does not require window.ethereum.enable()
      return true; // If you're able to access the provider, return true
    } catch (err) {
      return false;
    }
  }
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        // When the account changes in MetaMask, re-run login with the new account
        if (accounts.length > 0) {
          login();
        }
      });
    }
  }, []);

  // Login to Metamask and check if the user exists; else, create one
  async function login() {
    try {
      const provider = new ethers.providers.Web3Provider(
        window.ethereum,
        "any"
      );
      await provider.send("eth_requestAccounts", []); // Prompt account selection in MetaMask
      const signer = provider.getSigner();
      const address = await signer.getAddress();

      // Rest of the login code
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractABI,
        signer
      );
      setMyContract(contract);

      // Check if the account exists or create a new one
      let present = await contract.checkUserExists(address);
      let username;
      if (present) {
        username = await contract.getUsername(address);
      } else {
        username = prompt("Enter a username", "Guest");
        if (username === "") username = "Guest";
        await contract.createAccount(username);
      }
      setMyName(username);
      setMyPublicKey(address);
      setShowConnectButton("none");
    } catch (err) {
      console.error("Error logging in:", err);
      alert("Couldn't connect to MetaMask");
    }
  }

  // Add a friend to the user's Friends List
  async function addChat(name, publicKey) {
    try {
      let present = await myContract.checkUserExists(publicKey);
      if (!present) {
        alert("Given address not found: Ask him to join the app :)");
        return;
      }
      try {
        await myContract.addFriend(publicKey, name);
        const frnd = { name: name, publicKey: publicKey };
        setFriends((prevFriends) => [...prevFriends, frnd]); // Use functional state update
      } catch (err) {
        alert(
          "Friend already added! You can't be friend with the same person twice ;P"
        );
      }
    } catch (err) {
      alert("Invalid address!");
    }
  }

  // Sends message to a user
  async function sendMessage(data) {
    if (!(activeChat && activeChat.publicKey)) return;
    const recieverAddress = activeChat.publicKey;
    await myContract.sendMessage(recieverAddress, data);
  }

  // Fetch chat messages with a friend
  async function getMessage(friendsPublicKey) {
    let nickname;
    let messages = [];
    friends.forEach((item) => {
      if (item.publicKey === friendsPublicKey) nickname = item.name;
    });
    // Get messages
    const data = await myContract.readMessage(friendsPublicKey);
    data.forEach((item) => {
      const timestamp = new Date(1000 * item[1].toNumber()).toUTCString();
      messages.push({
        publicKey: item[0],
        timeStamp: timestamp,
        data: item[2],
      });
    });
    setActiveChat({ friendname: nickname, publicKey: friendsPublicKey });
    setActiveChatMessages(messages);
  }

  // This executes every time page renders and when myPublicKey or myContract changes
  useEffect(() => {
    async function loadFriends() {
      let friendList = [];
      // Get Friends
      try {
        const data = await myContract.getMyFriendList();
        data.forEach((item) => {
          friendList.push({ publicKey: item[0], name: item[1] });
        });
      } catch (err) {
        friendList = [];
      }
      setFriends(friendList);
    }
    if (myContract) loadFriends(); // Ensure myContract is defined before loading friends
  }, [myPublicKey, myContract]);

  // Makes Cards for each Message
  const Messages = activeChatMessages
    ? activeChatMessages.map((message) => {
        let margin = "5%";
        let sender = activeChat.friendname;
        if (message.publicKey === myPublicKey) {
          margin = "15%";
          sender = "You";
        }
        return (
          <Message
            key={message.timeStamp} // Added key for React list
            marginLeft={margin}
            sender={sender}
            data={message.data}
            timeStamp={message.timeStamp}
          />
        );
      })
    : null;

  // Displays each chat card
  const chats = friends.map((friend) => (
    <ChatCard
      key={friend.publicKey} // Added key for React list
      publicKey={friend.publicKey}
      name={friend.name}
      getMessages={(key) => getMessage(key)}
    />
  ));

  return (
    <Container style={{ padding: "0px", border: "1px solid grey" }}>
      {/* This shows the navbar with connect button */}
      <NavBar username={myName} login={login} showButton={showConnectButton} />
      <Row>
        {/* Here the friends list is shown */}
        <Col style={{ paddingRight: "0px", borderRight: "2px solid #000000" }}>
          <div
            style={{
              backgroundColor: "#DCDCDC",
              height: "100%",
              overflowY: "auto",
            }}
          >
            <Row style={{ marginRight: "0px" }}>
              <Card
                style={{
                  width: "100%",
                  alignSelf: "center",
                  marginLeft: "15px",
                }}
              >
                <Card.Header>Chats</Card.Header>
              </Card>
            </Row>
            {chats}
            <AddNewChat
              myContract={myContract}
              addHandler={(name, publicKey) => addChat(name, publicKey)}
            />
          </div>
        </Col>
        <Col xs={8} style={{ paddingLeft: "0px" }}>
          <div style={{ backgroundColor: "#DCDCDC", height: "100%" }}>
            {/* Chat header with refresh button, username and public key are rendered here */}
            <Row style={{ marginRight: "0px" }}>
              <Card
                style={{
                  width: "100%",
                  alignSelf: "center",
                  margin: "0 0 5px 15px",
                }}
              >
                <Card.Header>
                  {activeChat.friendname} : {activeChat.publicKey}
                  <Button
                    style={{ float: "right" }}
                    variant='warning'
                    onClick={() => {
                      if (activeChat && activeChat.publicKey)
                        getMessage(activeChat.publicKey);
                    }}
                  >
                    Refresh
                  </Button>
                </Card.Header>
              </Card>
            </Row>
            {/* The messages will be shown here */}
            <div
              className='MessageBox'
              style={{ height: "400px", overflowY: "auto" }}
            >
              {Messages}
            </div>
            {/* The form with send button and message input fields */}
            <div
              className='SendMessage'
              style={{
                borderTop: "2px solid black",
                position: "relative",
                bottom: "0px",
                padding: "10px 45px 0 45px",
                margin: "0 95px 0 0",
                width: "97%",
              }}
            >
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  const messageInput = document.getElementById("messageData");
                  sendMessage(messageInput.value);
                  messageInput.value = "";
                }}
              >
                <Form.Row className='align-items-center'>
                  <Col xs={9}>
                    <Form.Control
                      id='messageData'
                      placeholder='Type your message'
                    />
                  </Col>
                  <Col xs={3}>
                    <Button type='submit'>Send</Button>
                  </Col>
                </Form.Row>
              </Form>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
