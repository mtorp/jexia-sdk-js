import { Dataset } from "../src/dataset";
import { QueryExecuterFactory } from "../src/queryExecuterFactory";
import { IRequestAdapter, IRequestOptions } from "../src/requestAdapter";
import { RTCModule } from "../src/rtcModule";

class WebSocketMock {
  public url: string;
  public onopen: Function;

  constructor(url: string) {
    this.url = url;
    setTimeout(() => this.onopen(), 100);
  }
}

describe("RTCModule class", () => {
  let reqAdapterMock: IRequestAdapter;
  let tokenManagerMock: any;
  let validToken: string = "validtoken";
  let testurl = "www.test.url";

  beforeEach(() => {
    tokenManagerMock = {
      get token(): Promise<string> {
        return Promise.resolve(validToken);
      },
    };
    reqAdapterMock = {
      execute(uri: string, opt: IRequestOptions): Promise<any> {
        return Promise.resolve();
      },
    };
  });

  describe("when initializing the RTCModule", () => {
    it("should pass the proper URL to the websocket client library", (done) => {
      let rtcm: any = new RTCModule(() => { return; }, (url: string) => new WebSocketMock(url) );
      rtcm.init(testurl, tokenManagerMock, reqAdapterMock).then( () => {
        expect(rtcm.websocket.url).toEqual(`ws://${testurl}:8082/${validToken}`);
        done();
      }).catch( (error: Error) => {
        done.fail("Initializing the RTCModule should not have failed.");
      });
    });
  });

  describe("when subscribing to events for a dataset", () => {
    it("should send the proper JSON message to Sharky", (done) => {
      let rtcm: any = new RTCModule(() => { return; }, (url: string) => new WebSocketMock(url) );
      let datasetName: string = "datasetName";
      let actionName: string = "select";
      let qef: QueryExecuterFactory = new QueryExecuterFactory(testurl, reqAdapterMock, tokenManagerMock);
      let ds: Dataset = new Dataset("public", datasetName, qef);
      rtcm.init(testurl, tokenManagerMock, reqAdapterMock).then( () => {
        spyOn(rtcm, "send");
        rtcm.subscribe(actionName, ds);
        expect(rtcm.send).toHaveBeenCalledWith({ type: "subscribe", nsp: `rest.${actionName}.${datasetName}`});
        done();
      }).catch( (error: Error) => {
        done.fail("Initializing the RTCModule should not have failed.");
      });
    });
  });

  describe("when receiving a message from Sharky", () => {
    it("should forward the message to the client defined callback", (done) => {
      let testCallback: Function = jasmine.createSpy("callback");
      let rtcm: any = new RTCModule(testCallback, (url: string) => new WebSocketMock(url) );
      rtcm.init(testurl, tokenManagerMock, reqAdapterMock).then( () => {
        rtcm.websocket.onmessage("test");
        expect(testCallback).toHaveBeenCalledWith("test");
        done();
      }).catch( (error: Error) => {
        console.log(error);
        done.fail("Initializing the RTCModule should not have failed.");
      });
    });
  });
});
