import { SupportedChainTypeEn } from '@/constants/chains';
import { localStorage } from '@/utils/storage/local';
import { SubscribableStore } from '@/utils/store/subscribableStore';

type TConnectedDAppInfo = TDAppInfo & {
  chainType: SupportedChainTypeEn;
  isConnected: boolean;
};

type TConnectionManagerState = {
  sites: TConnectedDAppInfo[];
};

const CONNECTION_STORAGE_KEY = 'elytroConnectionState';

class ConnectionManager {
  private connectedSites: Map<string, TConnectedDAppInfo> = new Map(); // Store connected sites
  private _store: SubscribableStore<TConnectionManagerState>;
  private _initialized = false;

  constructor() {
    this._store = new SubscribableStore({
      sites: [] as TConnectedDAppInfo[],
    });

    this._store.subscribe((state) => {
      localStorage.save({ [CONNECTION_STORAGE_KEY]: state });
    });
  }

  public async restore() {
    if (!this._initialized) {
      await this._initFromStorage();
    }
  }

  private async _initFromStorage() {
    const { [CONNECTION_STORAGE_KEY]: prevState } = (await localStorage.get([
      CONNECTION_STORAGE_KEY,
    ])) as { [CONNECTION_STORAGE_KEY]: TConnectionManagerState };

    if (prevState?.sites) {
      this._store.setState(prevState);

      prevState.sites.forEach((site) => {
        if (site.origin) {
          this.connectedSites.set(site.origin, site);
        }
      });
    }

    this._initialized = true;
  }

  public connect(dApp: TDAppInfo, chainType: SupportedChainTypeEn) {
    if (!dApp.origin) {
      return;
    }

    this.addConnectedSite({ ...dApp, isConnected: true, chainType: chainType });
  }

  public getSite(origin: string) {
    return this.connectedSites.get(String(origin));
  }

  public setSite(origin: string, info: TConnectedDAppInfo) {
    this.connectedSites.set(String(origin), info);
    this.syncToStorage();
  }

  public addConnectedSite({ origin, ...rest }: TConnectedDAppInfo) {
    this.connectedSites.set(origin!, { ...rest, origin });
    this.syncToStorage();
  }

  // maybe turn isConnected to false a while later
  public updateConnectSite(
    origin: string,
    updates: Omit<TConnectedDAppInfo, 'origin'>
  ) {
    const siteInfo = this.connectedSites.get(origin);

    if (siteInfo) {
      this.connectedSites.set(origin, { ...siteInfo, ...updates });
      this.syncToStorage();
    }
  }

  public hasPermission(origin: string): boolean {
    return this.connectedSites.get(origin)?.isConnected || false;
  }

  private syncToStorage() {
    this._store.setState({
      sites: [...this.connectedSites.values()],
    });
  }
}

const connectionManager = new ConnectionManager();

export default connectionManager;
