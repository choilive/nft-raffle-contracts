const user1 = { donations: [100, 50], totalUserDonation: 150 };
const user2 = { donations: [300, 70], totalUserDonation: 370 };
const tokensInTheBufferEndOfCycle = 1000;

const totalMatchUnits = ((user1.totalUserDonation ** (1/2)) + (user2.totalUserDonation ** (1/2))) ** 2;

const user1MatchUnits = (user1.totalUserDonation ** (1/2)) * (totalMatchUnits ** (1/2))

const user2MatchUnits = (user2.totalUserDonation ** (1/2)) * (totalMatchUnits ** (1/2))

const user1Rewards = tokensInTheBufferEndOfCycle * (user1MatchUnits / totalMatchUnits)

const user2Rewards = tokensInTheBufferEndOfCycle * (user2MatchUnits / totalMatchUnits)

console.log('totalMatchUnits',totalMatchUnits);
console.log('user1MatchUnits',user1MatchUnits);
console.log('user1Rewards',user1Rewards);
console.log('------------------');

console.log('user1MatchUnits',user1MatchUnits);
console.log('user1Rewards',user1Rewards);

