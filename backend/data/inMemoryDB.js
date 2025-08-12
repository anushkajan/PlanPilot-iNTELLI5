// In-memory database for PlanPilot
// In production, this would be replaced with a real database

const users = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    password: '$2a$10$hashedpassword123', // bcrypt hash
    createdAt: new Date()
  }
];

const events = [
  {
    id: '1',
    name: 'Summer Wedding',
    type: 'Wedding',
    date: new Date('2024-07-15'),
    description: 'Beautiful summer wedding celebration',
    hostId: '1',
    collaborators: [],
    vendors: [],
    createdAt: new Date()
  }
];

const tasks = [
  {
    id: '1',
    name: 'Book Venue',
    description: 'Find and book the perfect wedding venue',
    assigneeId: '1',
    dueDate: new Date('2024-03-01'),
    status: 'To-Do',
    eventId: '1',
    createdAt: new Date()
  }
];

const guests = [
  {
    id: '1',
    name: 'Jane Smith',
    email: 'jane@example.com',
    plusOne: 1,
    notes: 'Vegetarian meal preference',
    rsvpStatus: 'Pending',
    eventId: '1',
    createdAt: new Date()
  }
];

const vendors = [
  {
    id: '1',
    companyName: 'Elegant Catering',
    contactName: 'Sarah Johnson',
    email: 'sarah@elegantcatering.com',
    serviceProvided: 'Catering',
    eventId: '1',
    createdAt: new Date()
  }
];

const expenses = [
  {
    id: '1',
    name: 'Venue Deposit',
    category: 'Venue',
    amount: 2500,
    isPaid: true,
    eventId: '1',
    createdAt: new Date()
  }
];

module.exports = {
  users,
  events,
  tasks,
  guests,
  vendors,
  expenses
}; 