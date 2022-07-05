const user1 = { donations: [100, 50], totalUserDonation: 150 };
const user2 = { donations: [300, 70], totalUserDonation: 370 };
const user3 = { donations: [200, 60], totalUserDonation: 260 };
const tokensInTheBufferEndOfCycle = 1000;

const totalMatchUnits = ((user1.totalUserDonation ** (1/2)) + (user2.totalUserDonation ** (1/2)) + (user3.totalUserDonation ** (1/2))) ** 2;

const user1MatchUnits = (user1.totalUserDonation ** (1/2)) * (totalMatchUnits ** (1/2))

const user2MatchUnits = (user2.totalUserDonation ** (1/2)) * (totalMatchUnits ** (1/2))

const user3MatchUnits = (user3.totalUserDonation ** (1/2)) * (totalMatchUnits ** (1/2))

const user1Rewards = tokensInTheBufferEndOfCycle * (user1MatchUnits / totalMatchUnits)

const user2Rewards = tokensInTheBufferEndOfCycle * (user2MatchUnits / totalMatchUnits)

const user3Rewards = tokensInTheBufferEndOfCycle * (user3MatchUnits / totalMatchUnits)

console.log('totalMatchUnits',totalMatchUnits);
console.log('user1MatchUnits',user1MatchUnits);
console.log('user2MatchUnits', user2MatchUnits);
console.log('user1Rewards',user1Rewards);
console.log('user2Rewards',user2Rewards);
console.log('user3Rewards',user3Rewards);

console.log('------------------');

console.log('user1MatchUnits',user1MatchUnits);
console.log('user1Rewards',user1Rewards);

