import React, { useEffect } from 'react'
import './App.css';
import { io } from "socket.io-client";
import { Row, Col, InputNumber, Card, Button, Space, Timeline } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const socket = io("http://10.161.214.175:8123");


function arrayBufferToBase64(buffer) {
  let binary = '';
  let bytes = new Uint8Array(buffer);
  let len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

class DetectionViewer extends React.Component {
  constructor(props) {
    super(props);
    this.canvasRef = React.createRef();
  }

  componentDidMount() {
    let that = this;
    that.canvasRef.current.addEventListener("mousedown", (e) => {
      console.log(e);
    })
    socket.on("detection_image", (data) => {
      console.log("receive detection_image")
      const c = that.canvasRef.current;
      if (c != null) {
        const ctx = c.getContext('2d');
        const image = new Image();
        image.onload = function () {
          console.log(c.width)
          console.log(ctx.canvas.clientWidth)
          console.log(image.height / image.width * ctx.canvas.clientWidth)
          const w = ctx.canvas.clientWidth;
          const h = image.height / image.width * ctx.canvas.clientWidth;
          c.width = w;
          c.height = h;
          ctx.drawImage(image, 0, 0, w, h);
        };
        image.src = `data:image/png;base64,${arrayBufferToBase64(data.data)}`;
      }
    });
  }

  render() {
    return (
      <div className="DetectionViewer">
        <canvas ref={this.canvasRef} style={{width: '100%'}}> Your browser cannot support canvas.</canvas>
      </div>
    );
  }
}


class ControlPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isGoHomeLoading: false
    };
    this.onGoHomeClicked = this.onGoHomeClicked.bind(this);
  }

  onGoHomeClicked() {
    console.log("onGoHomeClicked");
    let that = this;
    if (socket.connected) {
      socket.emit("cmd", {
        name: "go_home"
      }, (data) => {
        that.setState({
          isGoHomeLoading: false
        });
      });
      this.setState({
        isGoHomeLoading: true
      });
    }
  }

  onStopClicked() {
    console.log("onStopClicked");
    let that = this;
    if (socket.connected) {
      socket.emit("cmd", {
        name: "stop"
      }, (data) => {
      });
    }
  }

  render() {
    return (
      <Card title="控制面板" style={{width: '100%'}} size="small">
        <Space direction="vertical" size="middle">
          <Row gutter={8} justify="space-between" style={{width: 190}}>
            <Col span={12}>
              <Button block onClick={this.onGoHomeClicked} loading={this.state.isGoHomeLoading}>归位</Button>
            </Col>
            <Col span={12}>
              <Button block danger type="primary" onClick={this.onStopClicked}>停止</Button>
            </Col>
          </Row>
          <Row gutter={8} justify="space-between">
            <Col span={12}>
              <Button block>自动运行</Button>
            </Col>
            <Col span={12}>
              <Button block type="primary">暂停</Button>
            </Col>
          </Row>
          <Row gutter={8} justify="space-between">
            <Col span={8}>
              <Button block icon={<ArrowUpOutlined/>}/>
            </Col>
            <Col span={8}>
              <InputNumber min={0} max={10} defaultValue={3.0} step={1.0} style={{width: 60}}/>
            </Col>
            <Col span={8}>
              <Button block icon={<ArrowDownOutlined/>}/>
            </Col>
          </Row>
        </Space>
      </Card>
    );
  }
}

class TaskStatusPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      processName: "",
      processStatus: "",
      processId: 0,
      taskInfo: [],
      msg: "",
      isRunning: false,
    };
  }

  componentDidMount() {
    const that = this;
    socket.on("task-status", (data) => {
      console.log("receive task-status");
      console.log(data);
      that.setState({
        processName: data.processName,
        processStatus: data.processStatus,
        taskInfo: data.taskInfo,
        processId: data.processId,
        msg: data.msg,
      })
    });
  }

  render() {
    let timeline = <div>No Running Task</div>
    if (this.state.taskInfo.length > 0) {
      let curIdx = this.state.taskInfo.length;
      timeline = this.state.taskInfo.map((data, idx) => {
        let color = "green";
        if (idx > curIdx) {
          color = "gray";
        }
        let txt = data;
        if (this.state.processId === idx) {
          curIdx = idx;
          txt = this.state.processName;
          if (this.state.processStatus === "running") {
            color = "blue";
          } else if (this.state.processStatus === "error") {
            color = "red";
          } else {
            color = "green";
          }
        }
        return <Timeline.Item key={idx.toString()} color={color}>
          {txt}
        </Timeline.Item>
      });
    }
    return (
      <Card title="系统状态" style={{flex: 1}} size="small">
        <Timeline>
          {timeline}
        </Timeline>
      </Card>
    );
  }
}

function App() {
  useEffect(() => {
    console.log('App effect')
    socket.on("connect", () => {
      console.log("connect");
      console.log(socket.id)
    });

    socket.on("disconnect", () => {
      console.log("disconnect");
      console.log(socket.id)
    });
  }, []);

  return (
    <div className="App">
      <Row style={{height: '100%'}} gutter={8}>
        <Col flex="auto" style={{display: 'flex', flexDirection: 'column'}}>
          <div  style={{height: 120, backgroundColor: 'white'}}>URDF viewer</div>
          <div style={{height: 8}}/>
          <DetectionViewer/>
        </Col>
        <Col flex="200px" style={{display: 'flex', flexDirection: 'column'}}>
          <ControlPanel/>
          <div style={{height: 8}}/>
          <TaskStatusPanel/>
        </Col>
      </Row>
    </div>
  );
}

export default App;
