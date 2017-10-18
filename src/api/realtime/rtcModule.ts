import { IRequestAdapter } from "../../internal/requestAdapter";
import { IModule } from "../core/module";
import { TokenManager } from "../core/tokenManager";
import { Dataset } from "../dataops/dataset";
import { MESSAGE } from "../../config/message";
import { API } from "../../config/config";

export class RTCModule implements IModule {
  private websocket: WebSocket;
  private appUrl: string;
  private websocketCreateCallback: Function;
  private messageReceivedCallback: Function;

  constructor(messageReceivedCallback: Function, websocketCreateCallback?: Function) {
    this.messageReceivedCallback = messageReceivedCallback;
    if (websocketCreateCallback) {
      this.websocketCreateCallback = websocketCreateCallback;
    } else {
      this.websocketCreateCallback = (appUrl: string) => new WebSocket(appUrl);
    }
  }

  public init(appUrl: string, tokenManager: TokenManager, requestAdapter: IRequestAdapter): Promise<RTCModule> {
    this.appUrl = appUrl;
    return tokenManager.token.then( (token) => {
      try {
        this.websocket = this.websocketCreateCallback(this.buildSocketOpenUri(appUrl, token));
      } catch (error) {
        throw new Error(`${MESSAGE.RTC.ERROR_CREATING_WEBSOCKET} Original error: ${error.message}`);
      }

      if (!this.websocket) {
        return Promise.reject(MESSAGE.RTC.BAD_WEBSOCKET_CREATION_CALLBACK);
      }

      this.websocket.onmessage = (message: MessageEvent) => {
        const messageData = JSON.parse(message.data);
        if (messageData.type === "event") {
          this.messageReceivedCallback(messageData.data);
        }
      };
      return new Promise((resolve, reject) => {
        this.websocket.onopen = () => {
          resolve();
        };
        this.websocket.onerror = (err) => {
          reject(err);
        };
      }).then( () => this);
    });
  }

  private associateMethod(method: string) {
    switch(method) {
      case 'insert':
        return 'post';
      case 'select':
        return 'get';
      case 'update':
        return 'put';
    }
    return method;
  }

  public subscribe(method: string, dataset: Dataset) {
    this.send({type: "subscribe", nsp: this.buildSubscriptionUri(method, dataset.name)});
  }

  public unsubscribe(method: string, dataset: Dataset) {
    this.send({type: "unsubscribe", nsp: this.buildSubscriptionUri(method, dataset.name)});
  }

  public terminate() {
    return new Promise( (resolve, reject) => {
      this.websocket.onclose = () => resolve();
      this.websocket.onerror = (err) => {
        reject(err);
      };
      this.websocket.close();
    });
  }

  private send(message: object) {
    if (!this.websocket) {
      throw new Error(MESSAGE.RTC.NO_WESBSOCKET_PRESENT);
    }
    try {
      this.websocket.send(JSON.stringify(message));
    } catch (error) {
      if  (error.message === MESSAGE.RTC.NOT_OPEN_ERROR) {
        throw new Error(MESSAGE.RTC.NOT_OPEN_MESSAGE);
      }
      throw new Error(error);
    }
  }

  private buildSubscriptionUri(method: string, datasetName: string) {
    return `${datasetName}.${this.associateMethod(method)}`;
  }

  private buildSocketOpenUri(appUrl: string, token: string) {
    return `ws://${appUrl}:${API.SOCKETPORT}/${token}`;
  }
}
