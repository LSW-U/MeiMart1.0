import type { DeliveryTask, TaskStatus } from '@/src/types/task';

type TaskLists = {
  available: DeliveryTask[];
  pickups: DeliveryTask[];
  deliveries: DeliveryTask[];
};

const mockTasks: DeliveryTask[] = [
  {
    id: '102',
    orderId: 'JD Delivery #102',
    status: 'available',
    pickup: {
      title: 'LegoMart (Yangpu Center)',
      address: '1757 Nanlu Highway, Pudong, Shanghai',
      contactName: 'LegoMart Front Desk',
      contactPhone: '+86 138 0000 1020',
    },
    dropoff: {
      title: 'Yangpu TCM Hospital (18555 Meizhou Rd)',
      address: '18555 Meizhou Rd, Yangpu, Shanghai',
      contactName: 'Room 4072',
      contactPhone: '+86 139 0000 4072',
    },
    fee: 10,
    distanceKm: 2.5,
    estimatedMinutes: 37,
    items: ['Supermarket', '2kg', '2 units'],
    note: 'Extra large Matcha Latte, hot, no cream',
  },
  {
    id: '103',
    orderId: 'JD Delivery #103',
    status: 'available',
    pickup: {
      title: 'Luckin Coffee (Changyang Valley)',
      address: 'Changyang Valley Commercial Street',
      contactName: 'Luckin Counter',
    },
    dropoff: {
      title: 'Changyang Valley Bldg A',
      address: 'Changyang Valley Bldg A Lobby',
      contactName: 'Office Reception',
    },
    fee: 6.5,
    distanceKm: 1,
    estimatedMinutes: 45,
    items: ['Coffee', '1 bag'],
  },
  {
    id: '104',
    orderId: 'JD Delivery #104',
    status: 'accepted',
    pickup: {
      title: 'JiuJiu Apt - Bldg 1 (81216)',
      address: '1757 Nanlu Highway, Pudong, Shanghai',
      contactName: 'Merchant Pickup Desk',
    },
    dropoff: {
      title: 'JiuJiu Apt - Bldg 1 (81216)',
      address: 'Meizhou Road, Yangpu District, Shanghai',
      contactName: 'Resident 81216',
    },
    fee: 10,
    distanceKm: 2.5,
    estimatedMinutes: 30,
    items: ['Supermarket', '2kg', '2 units'],
    note: 'Large Matcha Latte, hot, no cream',
  },
  {
    id: '105',
    orderId: 'JD Delivery #105',
    status: 'delivering',
    pickup: {
      title: 'LegoMart (Yangpu Center)',
      address: '1757 Nanlu Highway, Pudong, Shanghai',
      contactName: 'LegoMart Front Desk',
    },
    dropoff: {
      title: 'Jiumei Apartment - Bldg 5 (Room 402)',
      address: 'Jiumei Apartment, Building 5, Room 402',
      contactName: 'Room 402',
      contactPhone: '+86 139 0000 4072',
    },
    fee: 10,
    distanceKm: 2.5,
    estimatedMinutes: 30,
    items: ['Matcha Latte', 'Seasonal Fruit Platter'],
    note: 'Call on arrival. Do not leave at door.',
  },
];

const cloneTask = (task: DeliveryTask): DeliveryTask => ({
  ...task,
  pickup: { ...task.pickup },
  dropoff: { ...task.dropoff },
  items: [...task.items],
});

const findTask = (id: string) => mockTasks.find((task) => task.id === id);

export async function getAvailableTasks(): Promise<DeliveryTask[]> {
  return mockTasks.filter((task) => task.status === 'available').map(cloneTask);
}

export async function getTaskLists(): Promise<TaskLists> {
  return {
    available: mockTasks.filter((task) => task.status === 'available').map(cloneTask),
    pickups: mockTasks.filter((task) => task.status === 'accepted' || task.status === 'pickingUp').map(cloneTask),
    deliveries: mockTasks.filter((task) => task.status === 'delivering').map(cloneTask),
  };
}

export async function getTaskById(id: string): Promise<DeliveryTask | null> {
  const task = findTask(id);
  return task ? cloneTask(task) : null;
}

export async function acceptTask(id: string): Promise<DeliveryTask> {
  return updateTaskStatus(id, 'accepted');
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<DeliveryTask> {
  const task = findTask(id);

  if (!task) {
    throw new Error(`Task not found: ${id}`);
  }

  task.status = status;
  return cloneTask(task);
}
