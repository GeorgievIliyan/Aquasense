import React from 'react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import WaterPotability from './components/WaterPotability';

function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <WaterPotability />
    </ChakraProvider>
  );
}

export default App;