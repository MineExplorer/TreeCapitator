class VanillaTreeLogger extends TreeLogger {
	checkLog(x: number, y: number, z: number, passedMap: {[key: string]: boolean}): boolean {
		if (Math.abs(x - this.startCoords.x) > this.logDestroyRadius ||
			Math.abs(z - this.startCoords.z) > this.logDestroyRadius) {
			return false;
		}
		
		const coordKey = this.getCoordKey(x, y, z);
		if (passedMap[coordKey]) {
			return false;
		}
		passedMap[coordKey] = true;

		const block = this.region.getBlock(x, y, z);
		if (!this.hasLeaves && TreeCapitator.isTreeBlock(block, this.tree.leaves)) {
			this.hasLeaves = true;
		}
		else if (TreeCapitator.isTreeBlock(block, this.tree.log)) {
			this.logCoords.push({x: x, y: y, z: z});
			this.checkNeighbourLogs(x, y, z, passedMap);
			return true;
		}
		return false;
	}
	
	forEachLeafNeighbour(x: number, y: number, z: number, callback: (x: number, y: number, z: number, distance: number) => void): void {
		callback(x - 1, y, z, 1);
		callback(x + 1, y, z, 1);
		callback(x, y - 1, z, 1);
		callback(x, y + 1, z, 1);
		callback(x, y, z - 1, 1);
		callback(x, y, z + 1, 1);
	}

	forEachForeignLeafNeighbour(x: number, y: number, z: number, callback: (x: number, y: number, z: number, distance: number) => void): void {
		this.forEachLeafNeighbour(x, y, z, callback);
	}
}