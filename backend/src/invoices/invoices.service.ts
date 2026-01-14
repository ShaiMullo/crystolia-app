import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { Order, OrderDocument } from '../orders/schemas/order.schema';

@Injectable()
export class InvoicesService {
    constructor(
        @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    ) { }

    private async generateInvoiceNumber(): Promise<string> {
        const year = new Date().getFullYear();
        const count = await this.invoiceModel.countDocuments();
        const num = String(count + 1).padStart(4, '0');
        return `INV-${year}-${num}`;
    }

    async create(createInvoiceDto: CreateInvoiceDto): Promise<Invoice> {
        const order = await this.orderModel
            .findById(createInvoiceDto.orderId)
            .populate('customer')
            .exec();

        if (!order) {
            throw new NotFoundException(`Order ${createInvoiceDto.orderId} not found`);
        }

        // Check if invoice already exists for this order
        const existingInvoice = await this.invoiceModel.findOne({ order: order._id } as any).exec();
        if (existingInvoice) {
            throw new BadRequestException('Invoice already exists for this order');
        }

        const invoiceNumber = await this.generateInvoiceNumber();

        const invoice = new this.invoiceModel({
            invoiceNumber,
            order: order._id,
            customer: (order.customer as any)._id,
            amount: order.totalAmount,
        });

        return invoice.save();
    }

    async findAll(role: string, userId: string): Promise<Invoice[]> {
        if (role === 'admin' || role === 'secretary') {
            return this.invoiceModel
                .find()
                .populate('order')
                .populate('customer')
                .sort({ createdAt: -1 })
                .exec();
        }

        // For customers, find invoices linked to their customer profile
        // This requires knowing the customer ID from userId - simplified here
        return this.invoiceModel
            .find()
            .populate({ path: 'customer', match: { user: userId } })
            .populate('order')
            .sort({ createdAt: -1 })
            .exec()
            .then(invoices => invoices.filter(inv => inv.customer !== null));
    }

    async findOne(id: string): Promise<Invoice> {
        const invoice = await this.invoiceModel
            .findById(id)
            .populate('order')
            .populate('customer')
            .exec();

        if (!invoice) {
            throw new NotFoundException(`Invoice ${id} not found`);
        }

        return invoice;
    }

    async findByOrder(orderId: string): Promise<Invoice | null> {
        return this.invoiceModel.findOne({ order: orderId } as any).exec();
    }

    async createForOrder(orderId: string): Promise<Invoice> {
        return this.create({ orderId });
    }
}
