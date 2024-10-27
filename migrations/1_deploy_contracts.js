const Database = artifacts.require("Database");

module.exports = async function (deployer) {
  try {
    await deployer.deploy(Database, { gas: 5000000 });
    console.log("Database contract deployed successfully.");
  } catch (error) {
    console.error("Error deploying Database contract:", error);
  }
};
