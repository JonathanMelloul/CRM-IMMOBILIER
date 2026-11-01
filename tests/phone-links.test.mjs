import test from 'node:test';
import assert from 'node:assert/strict';
import {whatsappNumber} from '../src/lib/phone-links.ts';

test('international numbers keep their country code and formatting is removed',()=>{
 for(const phone of ['+33 6 12 34 56 78','0033 6 12 34 56 78','33612345678','p:+33612345678','+33 (0)6 12 34 56 78'])assert.equal(whatsappNumber(phone),'33612345678');
 assert.equal(whatsappNumber('+972 (54) 123-4567'),'972541234567');
 assert.equal(whatsappNumber('+1 (212) 555-0100'),'12125550100');
});
test('local numbers use the explicit country, without guessing an unknown country',()=>{
 for(const region of ['fr','France','צרפת'])assert.equal(whatsappNumber('06 12 34 56 78',region),'33612345678');
 for(const region of ['il','Israël','ישראל'])assert.equal(whatsappNumber('054-123-4567',region),'972541234567');
 assert.equal(whatsappNumber('541234567','israel'),'972541234567');
 assert.equal(whatsappNumber('06 12 34 56 78'),null);
 assert.equal(whatsappNumber('0541234567','other'),null);
});
test('incomplete, malformed and non-phone input never becomes a WhatsApp destination',()=>{
 for(const value of ['','690980','+01234567890','++33612345678','+33 6 12 ext 78','https://example.test','+1234567890123456','+33612345678?text=hello'])assert.equal(whatsappNumber(value),null,value);
});
