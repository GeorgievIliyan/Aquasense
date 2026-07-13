import React from 'react';
import { Box, Container, HStack, VStack, Heading, Text, Button } from '@chakra-ui/react';

const TopNavbar = ({ tabs, activeTab, onTabChange }) => {
  return (
    <Box bg="white" borderBottom="1px solid #e5e7eb" width="100%">
      <Container maxW="6xl" py={{ base: 4, md: 5 }}>
        {/* Header Section */}
        <HStack spacing={4} align="flex-start" mb={6}>
          <svg width="48" height="48" viewBox="0 0 766 773" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M54 479.5V312H315.451C321.784 312 328.084 311.087 334.157 309.29L343.664 306.476C372.19 298.032 397.413 280.984 415.885 257.663C421.76 250.247 433.079 250.415 438.768 257.974C456.16 281.088 480.104 298.55 507.442 308.003L509.85 308.836C515.908 310.931 522.272 312 528.682 312H707.5V479.5H392.5C349.698 479.5 315 444.802 315 402H241C241 444.802 206.302 479.5 163.5 479.5H147.5H54Z" fill="#4EA5BB" />
            <path d="M358.445 758.333L66.7433 587.571C48.9242 577.14 56.6751 549.832 77.3172 550.317L173.851 552.585C185.458 552.858 196.971 550.432 207.481 545.499L211.637 543.548C230.734 534.584 248.129 522.371 263.046 507.454L264.12 506.38C270.869 499.631 281.882 499.871 288.331 506.906C302.322 522.17 319.021 534.709 337.581 543.89L341.152 545.656C350.919 550.487 361.669 553 372.565 553H690.698C711.171 553 718.421 580.114 700.679 590.331L408.658 758.511C393.102 767.47 373.937 767.402 358.445 758.333Z" fill="#06728A" />
            <path d="M305.5 224.5H73.7582C53.4327 224.5 46.0657 197.699 63.5354 187.31L352.99 15.1707C368.716 5.81868 388.294 5.80272 404.034 15.1291L700.297 190.664C717.936 201.115 710.301 228.177 689.802 227.868L545.991 225.704C501.62 225.036 466 188.876 466 144.5H385.5C385.5 188.683 349.683 224.5 305.5 224.5Z" fill="#9CE0EB" />
          </svg>

          <VStack align="start" spacing={0}>
            <Heading size="2xl" color="#4c8baa" fontWeight={700} lineHeight={1}>
              AquaSense
            </Heading>
            <Text fontSize="xs" color="gray.600" lineHeight={1}>
              ML за питейност на водата
            </Text>
          </VStack>
        </HStack>

        {/* Navigation Tabs */}
        <Box bg="white" p={1.5} borderRadius="xl" border="1px solid #e5e7eb">
          <HStack spacing={2} wrap="wrap">
            {tabs.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === index;
              return (
                <Button
                  key={tab.label}
                  onClick={() => onTabChange(index)}
                  variant={isActive ? 'solid' : 'ghost'}
                  bg={isActive ? '#4c8baa' : 'transparent'}
                  color={isActive ? 'white' : '#374151'}
                  _hover={{ bg: isActive ? '#3d6b88' : '#f3f4f6' }}
                  borderRadius="lg"
                  flex="1"
                  minW="120px"
                  justifyContent="center"
                >
                  <HStack spacing={2}>
                    <Icon size={18} />
                    <Text>{tab.label}</Text>
                  </HStack>
                </Button>
              );
            })}
          </HStack>
        </Box>
      </Container>
    </Box>
  );
};

export default TopNavbar;