import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'GenesisPad',
  projectId: '05b69d07a6f74a2c97ad2ec3413c2648',
  chains: [sepolia],
  ssr: false,
});
