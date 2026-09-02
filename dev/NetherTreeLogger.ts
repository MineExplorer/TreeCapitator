class NetherTreeLogger extends TreeLogger {
	checkNeighbourLeaves(x: number, y: number, z: number, currentLeaves: Vector[]): void {
		for (let dx = -1; dx <= 1; dx++)
		for (let dz = -1; dz <= 1; dz++)
		for (let dy = -1; dy <= 1; dy++) {
			this.checkLeaves(x + dx, y + dy, z + dz, dx == 0 && dz == 0 ? currentLeaves : this.nextLeaves);
		}
	}

	destroyLeaves(): void {
		const emptyItem = {id: 0, count: 0, data: 0};
		for (let iteration = 1; iteration <= this.leavesDestroyRadius && this.nextLeaves.length > 0; iteration++) {
			const leavesToDestroy = this.nextLeaves;
			this.nextLeaves = [];
			for (let index = 0; index < leavesToDestroy.length; index++) {
				const coords = leavesToDestroy[index];
				const block = this.region.getBlock(coords.x, coords.y, coords.z);
				this.destroyBlock(coords.x, coords.y, coords.z, block, emptyItem);
				this.checkNeighbourLeaves(coords.x, coords.y, coords.z, leavesToDestroy);
			}
		}
	}
}